// ==UserScript==
// @name            BRchan Rusifikator
// @version         3.3.1
// @namespace       https://brchan.org/*
// @author          Y0ba, Isset, pngcrypt
// @updateURL       https://raw.github.com/Isseq/Brchanrus.user.js/master/Brchanrus.meta.js
// @run-at          document-start
// @grant           none
// @include         https://brchan.org/*
// @include         http://brchan.org/*
// @include         https://www.brchan.org/*
// @include         http://www.brchan.org/*
// @nocompat        Chrome
// ==/UserScript==

/*
TODO: 
	- шаблон поиска/замены времени в regex: модификатор RE_TIME (указывает наличие шаблона). сам шаблон: (:<time>n d y h i s) - ndyhis - заменяются на (\d+). пробел - на \D+
	- 'nod': в расширенном regex вместо sub-query
	- 'css': сделать возможность вложенности других реплейсеров (дерево селекторов, рекурсия)
	- нумерация постов без куклы
*/

////////// wrapper /////////
(function() {
'use strict';
////////////////////////////

const TIME_CORR = 6; // коррекция времени (смещение в часах от бразильского для нужного часового пояса; положительное или отрицательно)
const TIME_BR = -3; // часовой пояс Бразилии (НЕ МЕНЯТЬ!)

// формат вывода даты
const DATE_FORMAT = "_d/_n/_y (_w) _h:_i:_s"; // _d - день; _n - месяц; _y - год (2 цифры); _Y - год (4 цифры); _w - день недели (сокр.); _h - часы; _i - минуты; _s - секунды


const RE_DEBUG = true;

// типы замены контента
const RE_TEXT = 'textContent'; // текст внутри элемента [по умолчанию] (все тэги будут удалены)
const RE_INNER = 'innerHTML'; // html код внутри элемента
const RE_OUTER = 'outerHTML'; // hmtl код, включая найденный элемент

// режимы поиска строк по regex
const RE_SINGLE = 10; // [по умолчанию] однократный (после замены regex исключается из дальнейшего поиска)
const RE_MULTI = 11; // многократый (поиск во всех элементах)

// режим прерывания поиска по regex
const RE_NOBREAK = 20; // перебирать все regex независимо от результата (для текущего селектора)
const RE_BREAK = 21; // [по умолчанию] прерывать перебор на первом найденном regex (для текущего селектора)

// выбор дочернего узла (для 'nod')
const RE_FIRST = 30; // [по умолчанию] первая нода
const RE_LAST = 31; // последняя

const RE_TIME = 40; // флаг наличия в regex шаблона для подстановки времени 

var replacer = {cfg:[], debug:RE_DEBUG};

var win = typeof unsafeWindow != 'undefined' ? unsafeWindow : window;
var con = win.console;
var doc = win.document;
con.debug = con.debug || con.log || function() {};
con.error = con.error || con.log || function() {};
con.group = con.group || function() { con.debug.apply(con, ["[+] -->"].concat(Array.from(arguments))); };
con.groupEnd = con.groupEnd || function() { con.debug('[-] ---'); };

/*Object.defineProperty(window, "win", {writable: false});
Object.defineProperty(window, "doc", {writable: false});
Object.defineProperty(window, "con", {writable: false});*/

function dbg() { if(RE_DEBUG) con.debug.apply(con, Array.from(arguments)); } // debug messages
function isArray(a) { return Array.isArray(a); }

// ==============================================================================================
// основной конифг перевода
// ==============================================================================================
/*
	общий синтаксис конфига:
	
	replacer.cfg["cfg_name"] = [
		[url-regex1, [ [replacer1.1], ..., [replacer1.N] ], re_arr1],
		...
		[url-regexM, [ [replacerM.1], ..., [replacerM.N] ], re_arrM],
	];

	где:
		cfg_name - имя создаваемого конфига
		url-regex - regex для проверки текущего URL страницы (если совпадает, то происходит обработка вложенной группы реплейсеров)
		replacer - массив с параметрами реплейсера (тип, css-селектор и т.п.)
				подробнее синтаксис каждого типа реплейсера см. в функциях реплейсеров (nodReplacer, cssReplacer, regReplacer и т.п.)
		re_arr - массив RE_* модификаторов по умолчанию для всех реплейсеров заданной группы url-regex

*/
replacer.cfg["main"] = [

	[/^/, [
		// Панель меню
		['nod', 'div.boardlist > span', [
			['a[href="/"]', ' Главная'],
			['a[href="/boards.html"]', ' Список досок'],
			['a[href="/random.php"]', ' На случайную доску'],
			['a[href="/create.php"]', ' Создать доску'],
			['a[href="/mod.php"]', ' Админка'],
			['a[href="/bugs.php"]', ' Сообщить об ошибке'],
		], [RE_LAST]],

		// Техобслуживание
		['reg', 'body > div:nth-child(1) > span:not([class])', [
			['BRchan em manutenção', 'Техобслуживание BRchan'],
			['O Bananal está em manutenção e deve voltar em breve', 'Бананал закрыт на техническое обслуживание и вернется в ближайшее время']
		]],

		[]
	]],

	// Любая доска / тред
	[/^(mod\.php\?\/)?[^/]+\/?(|(\d+[^/]*|index)\.html|\/res\/.+)$/, [
		['reg', 'header > div.subtitle > p > a', /Catálogo|Catalog/, 'Каталог тредов'],
		['reg', 'div.banner', 'Modo de postagem: Resposta', 'Форма ответа', [RE_INNER]],
		['reg', 'div.banner > a', [
			['Voltar', 'Назад'],
			['Ir ao rodapé', 'Вниз страницы']
		]],

		// Форма ответа
		['reg', 'table.post-table > tbody > tr > th', [
			['Opções', 'Опции'],
			['Assunto', 'Тема/Имя'],
			['Mensagem', 'Сообщение'],
			['Verificação', 'Капча'],
			['Arquivo', 'Файл'],
			['Nome', 'Имя']
		]],
		['css', 'table.post-table > tbody > tr > td', [
			['div.format-text > a', 'ВСТАВИТЬ'],
			['div.captcha_html', 'кликните сюда для показа']
		]],
		['css', 'div.file-hint', 'кликни / брось файл сюда'],
		['css', 'span.required-wrap > span.unimportant', '= обязательные поля'],
		['css', 'a.show-post-table-options', '[Показать опции]'],
		['att', 'table.post-table > tbody > tr > td > input[type="submit"]', 'value', [
			['Responder', 'Отправить'],
			['Novo tópico', 'Отправить'] // кукла использует эту кнопку для ответов с нулевой
		]],
		['css', 'tr#oekaki > th', 'Рисовать'],
		['css', 'tr#upload_embed > th', 'Ссылка на YouTube'],
		['css', 'tr#options-row > th', 'Опции'],
		['reg', 'form > table.post-table-options > tbody > tr > th', 'Senha', 'Пароль'],

		['reg', 'tr#oekaki > td > a', 'Mostrar oekaki', 'начать'],
		['reg', 'table.post-table-options span.unimportant', [
			['substitui arquivos', 'заменяет файл', [RE_MULTI, RE_NOBREAK]],
			['(para remover arquivos e mensagens)', '(для удаления файлов и сообщений)'],
			['(você também pode escrever sage no e-mail)', '(вы также можете писать sage в поле опций)'],
			['(isso substitui a miniatura da sua imagem por uma interrogação)', '(это заменяет превью вашего изображения знаком вопроса)']
		]],
		['reg', 'tr#options-row > td > div.no-bump-option > label', 'Não bumpar', 'Не поднимать тред (сажа)', [RE_INNER]],
		['reg', 'tr#options-row > td > div.spoiler-images-option > label', 'Imagem spoiler', 'Скрыть превью изображения', [RE_INNER]],

		['reg', 'table.post-table-options  p.unimportant', /Formatos permitidos:(.+)Tamanho máximo: (.+)Dimensões máximas (.+)Você pode enviar (.+) por mensagem/, 'Разрешенные форматы: $1Максимальный размер файлов: $2Максимальное разрешение: $3Вы можете отправить $4 файла в сообщении', [RE_INNER]],

		// Навигация по страницам
		['reg', 'body > div.pages', [
			['Anterior', 'Предыдущая'],
			['Próxima', 'Следующая'],
			['Catálogo', 'Каталог тредов']
		], [RE_INNER, RE_NOBREAK]],

		['css',	'a#thread-return',	'[Назад]'],
		['css',	'a#thread-top',		'[Вверх]'],
		['css',	'a#thread-catalog',	'[Каталог тредов]'],
		['css',	'a#link-quick-reply',	'[Ответить]'],

		[]
	]],

	// Любой тред без модерки
	[/^[^/]+\/res\//, [
		// добавить линк на нулевую 
		['reg', 'body > header > h1', /^(\/[^/]+\/)/, '<a href="$1">$1</a>', [RE_INNER]]
	]],

	// Любой тред под модеркой
	[/^mod\.php\?\/[^/]+\/res\//, [
		// добавить линк на нулевую 
		['reg', 'body > header > h1', /^(\/[^/]+\/)/, '<a href="/mod.php?$1">$1</a>', [RE_INNER]]
	]],

	// доска tudo ("все")
	[/^tudo\//, [
		['css', 'head > title, header > h1', 'Все доски'],
		['css', 'header > div.subtitle', 'Здесь показываются треды и посты со всех досок']
	]],

	// Ошибки постинга
	[/^(post|bugs)\.php/, [
		['reg', 'head > title, header > h1', [
			['Erro', 'Ошибка'],
			['Denúncia enviada', 'Жалоба отправлена']
		], [RE_INNER, RE_MULTI]],

		['reg', 'header > div.subtitle', 'Um erro ocorreu', 'Произошла ошибка'],
		['reg', 'body > div > h2', [
			['IP detectado como proxy, proxies nao sao permitidos nessa board. Se voce acha que essa mensagem e um erro entre em contato com a administracao', 'На этом IP обнаружен прокси. Прокси запрещены на этой доске. Если вы считаете, [что произошла ошибка, свяжитесь с администрацией'],
			['Senha incorreta', 'Неверный пароль']
		]],

		['css', 'body > div > p > a', 'Назад'],

		['reg', 'body > div > a', [
			['Fechar janela', 'Закрыть окно'],
			['Voltar ', 'Назад']
		]],

		[]
	]],

	// Страница каталога доски
	[/^[^/]+\/catalog\.html$/, [
		['reg', 'head > title', 'Catalog', 'Каталог тредов'],
		['nod', 'header > h1', 'Каталог тредов (', [RE_FIRST]],
		['reg', 'body > span', 'Ordenar por', 'Сортировка по'],
		['reg', 'body > span', 'Tamanho da imagem', 'Размер изображений'],

		['css', 'select#sort_by', [
			['option[value="bump:desc"]', 'Активности'],
			['option[value="time:desc"]', 'Дате создания'],
			['option[value="reply:desc"]', 'Кол-ву ответов'],
			['option[value="random:desc"]', 'Случайная']
		]],

		['css', 'select#image_size', [
			['option[value="vsmall"]', 'Крошечные'],
			['option[value="small"]', 'Маленькие'],
			['option[value="medium"]', 'Средние'],
			['option[value="large"]', 'Большие']
		]]
	]],

	// Список досок
	[/^boards\.html/, [
		// Статистика
		['css', 'main > section > h2', 'Статистика'],
		['reg', 'main > section > p', [
			[/Há atualmente (.+) boards públicas, (.+) no total. Na última hora foram feitas (.+) postagens, sendo que (.+) postagens foram feitas em todas as boards desde/, 'В настоящее время доступно $1 публичных досок из $2. За последнюю минуту написано $3 постов. Высего было написано $4 постов начиная с', [RE_INNER]],
			['Última atualização desta página', 'Последнее обновление страницы']
		]],

		// Панель поиска
		['css', 'aside > form > h2', 'Поиск'],
		['reg', 'aside > form label.search-item.search-sfw', 'Ocultar', 'Скрыть', [RE_INNER]],
		['att', 'input#search-title-input', 'placeholder', 'Поиск названия...'],
		['att', 'input#search-tag-input', 'placeholder', 'Поиск тэгов...'],
		['css', 'button#search-submit', 'Искать'],

		// Таблица списка досок
		['css', 'th.board-uri', 'Доска'],
		['css', 'th.board-title', 'Название'],
		['css', 'th.board-pph', 'п/ч'],
		['css', 'th.board-unique', 'IP за 72ч'],
		['css', 'th.board-tags', 'Тэги'],
		['css', 'th.board-max', 'Постов'],

		[]
	]],

	// Создание доски
	[/^create\.php/, [
		['css', 'head > title, header > h1', 'Создание доски'],
		['css', 'header > div.subtitle', 'создание пользовательской доски'], // ??? antes que alguém a crie

		['reg', 'table.modlog > tbody > tr > th', [
			['URI', 'URL'],
			['Título', 'Название'],
			['Subtítulo', 'Описание'],
			['Usuário', 'Логин'],
			['Senha', 'Пароль']
		]],

		['reg', 'table.modlog > tbody > tr > td > span', [
			[/letras, números e no máximo (\d+) caracteres/, 'буквы, цифры и не более $1 символов'],
			[/até (\d+) caracteres/, 'до $1 символов', [RE_MULTI]],
			['letras, numeros, pontos e sublinhados', 'буквы, цифры, точки и подчеркивание'],
			['senha para moderar a board, copie-a', 'пароль для модерирования, сохраните его'],
			['opcional,serve para recuperar sua board', 'по желанию, служит для восстановления доски']
		]],

		['att', 'input[type="submit"]', 'value', 'Создать доску'],

		// Ошибки создания / сообщения
		['reg', 'body > div > h2', [
			['URI inválida', 'Неверный URL'],
			['Usuário inválido', 'Недействительный пользователь'],
			['A board já existe', 'Доска уже существует'],
			['Você errou o codigo de verificação', 'Неверный код подтверждения']
		]],

		['reg', 'body > div > p > a', 'Voltar', 'Назад'],

		['reg', 'body > p', [
			['Sua board foi criada e está disponível em', 'Ваша доска была создана и доступна по адресу'],
			['Certifique-se de não esquecer a senha de sua board', 'Убедитесь в том, чтобы не забыть пароль к доске'],
			['Você pode gerenciar sua board nessa página', 'Вы можете управлять вашей доской на этой странице']
		], [RE_INNER]],

		[]
	]],

	// багрепорты
	[/^bugs\.php/, [
		['reg', 'head > title', 'BRCHAN :: SUIDB', 'Багрепорт'],
		['reg', 'div.ban.oficial > h2', [
			[/^SUIDB.+/, 'Единая Интегрированная Система Сообщений о Багах'],
			[/(\d+) bugs reportados, (\d+) corrigidos/, 'сообщений о багах: $1, исправлено: $2']
		]],
		['reg', 'div.ban.oficial > p', /^O BRchan migrou.+/, 'BRchan перешел на новый движок имиджборд - <b>Infinity</b>. И хоть он и более интерактивный, Infinity имеет огромное количество багов, которые мы готовы исправлять. Если вы нашли один из них, не стесняйтесь сообщить об этом.<br><br><small><i>* Не забывайте, что это бразильская борда и админ вряд ли знает русский язык :)</i></small>', [RE_INNER]],
		['reg', 'div.ban.oficial > form > table > tbody > tr > td', [
			['Você errou o codigo de verificação', 'Неверный код подтверждения'],
			[/Descreva em pelo menos (\d+) palavras o bug/, 'В описании должно быть не меньше $1 слов(а)'],
			['Digite o código de verificação anti-robôs', 'Введите код анти-спама'],
			['Detalhes', 'Подробности'],
			['Anti-robô', 'Анти-Спам']
		], [RE_INNER]],
		['att', 'div.ban.oficial > form input[type="submit"]', 'value', 'Отправить'],
		['reg', 'div.ban.oficial > h2', /(\d+) bugs reportados, (\d+) corrigidos/, 'сообщений о багах: $1, исправлено: $2'],

		// сообщения об отправке
		['reg', 'div.ban.oficial > div > h3', 'Seu formulário foi enviado!', 'Ваша форма отправлена!'],
		['reg', 'div.ban.oficial > div', 'Obrigado por nos ajudar a melhorar o', 'Благодарим вас за помощь в улучшении', [RE_INNER]],
		['reg', 'div.ban.oficial > div > a', 'Reportar mais bugs', 'Сообщить о других багах'],
	]],

	// Жалоба
	[/^report\.php/, [
		['reg', 'p', /^Enter reason below/, 'Введите причину жалобы'],
		['att', 'form > input[name="report"]', 'value', 'Отправить'],
	]],

	// Админка - логин / ошибки
	[/^mod\.php\b/, [
		['reg', 'head > title, header > h1', 'Login', 'Вход', [RE_MULTI]],
		['reg', 'body > form > table:nth-child(1) th', [
			['Usuário', 'Логин'],
			['Senha', 'Пароль']
		]],
		['att', 'input[name="login"]', 'value', 'Войти'],

		// Панель уведомлений
		['reg', 'body > div.top_notice:first-child', /You have(.+)an unread PM/, 'У вас есть$1Новые сообщения', [RE_INNER]],

		// Ошибки
		['reg', 'head > title, header > h1', 'Erro', 'Ошибка', [RE_MULTI]],
		['reg', 'body > h2', /Login e\/ou senha inválido\(s\)/, 'Неверный логин или пароль'],
		['reg', 'header > div.subtitle', 'Um erro ocorreu', 'Произошла ошибка'],
		['reg', 'body > div > h2', [
			['Pagina não encontrada', 'Страница не найдена'],
			['Login e/ou senha inválido', 'Неверный логин или пароль'],
			['Banner editing is currently disabled. Please check back later', 'Редактирование баннера отключено. Попробуйте позже'],
			['Usuário inválido', 'Неверное имя пользователя'],
			['Board inválida', 'Доска не существует'],
			['Você não tem permissão para fazer isso', 'У вас нет прав доступа к этой странице'],
			[]
		]],

		['reg', 'div.subtitle > p > a', 'Voltar à dashboard', 'Назад к панели управления'],
		['reg', 'body > div > p > a', 'Voltar', 'Назад'],

		[]
	]],

	// Админка - Главная
	[/^mod\.php\?\/$/, [
		['reg', 'head > title, header > h1', 'Dashboard', 'Панель администрирования', [RE_MULTI]],
		['reg', 'fieldset > legend', [
			['Mensagens', 'Сообщения'],
			['Administração', 'Администрирование'],
			['Boards', 'Доски'],
			['Conta de usuário', 'Учетная запись']
		]],
		['reg', 'fieldset > ul > li', 'Quadro de noticias', 'Последние объявления', [RE_INNER]],
		['reg', 'fieldset > ul > li a', [
			['Ver todas as noticias do quadro de noticias', 'Просмотр всех объявлений'],
			[/Caixa de entrada \((\d+) unread\)/, 'Входящие (непрочитанных: $1)'],

			[/Fila de denuncias \((\d+)\)/, 'Поступившие жалобы ($1)'],
			['Lista de bans', 'Список банов'],
			['Apelos a banimento', 'Аппеляции банов'],
			['Editar conta', 'Изменить учетную запись'],
		
			['Histórico da board', 'История событий доски'],
			['Mensagens recentes', 'Последние сообщения в тредах'],

			['configurações', 'настройки'],

			['Logout', 'Выход']
		]],
		['reg', 'fieldset > ul > li > span', 'nome de usuário, email, senha', 'имя пользователя, адрес электронной почты, пароль'],

		[]
	]],

	// Админка - Жалобы
	[/^mod\.php\?\/reports\/?$/, [
		['reg', 'head > title, header > h1', /Fila de denuncias\s+\((\d+)\)/, 'Поступившие жалобы ($1)'],
		['reg', 'body > p.unimportant', 'Não há denúncias no momento', 'На данный момент никаких жалоб нет', [RE_SINGLE]],

		['att', 'h2.report-header > a', 'title', 'Перейти в тред'],
		['reg', 'h2.report-header', [
			[/responder repotado (\d+) vez\(es\)/, 'жалоб на пост: $1'],
			[/thread repotado (\d+) vez\(es\)/, 'жалоб на тред: $1']
		], [RE_INNER]],

		['reg', 'div.report span.detail-name', 'Data da denúncia', 'Дата поступления:'],
		['reg', 'ul.report-actions > li.report-action > a', [
			['Dismiss', 'Отклонить'],
			['Promote', 'Принять']
		]],

		// Кнопки
		['reg', 'ul.report-content-actions > li.report-content-action', /^Clean/, 'Очистить', [RE_INNER]],
		['reg', 'ul.report-actions a.action-item, ul.report-content-actions a.content-action-item', [
			['Dismiss All', 'Отклонить все'],
			['Promote All', 'Принять все'],
			['Clean', 'Очистить']
		]],

		// Подсказки к кнопкам
		['att', 'ul.report-actions a.action-item', 'title', [
			['Descartar denúncia', 'Отклонить жалобу'],
			['Descartar todas denúncias deste IP', 'Отклонить все жалобы с этого IP'],
			['Promover denúncia local para global', 'Передать жалобу администраторам']
		]],
		['att', 'ul.report-content-actions a.content-action-item', 'title', [
			['Descartar todas denúncias a esse conteúdo', 'Отклонить все жалобы к этому посту'],
			['Promover todas denúncias locais para globais', 'Передать все жалобы к этому посту администраторам'],
			['Ignorar e descartar denúncias locais dessa mensagem nessa board', 'Игнорировать и удалить все жалобы в этом треде']
		]],

		[]
	], [RE_MULTI]],

	// Админка - Настройка доски
	[/^mod\.php\?\/settings\//, [
		['reg', 'head > title, header > h1', 'Configuração da board', 'Настройки доски', [RE_MULTI]],
		['css', 'body > p', 'Внимание: Некоторые изменения не вступят в силу до тех пор, пока не будет написан новый пост на доске.'],

		['reg', 'form > table:nth-child(2) th', [
			['URI', 'URL'],
			['Título', 'Название'],
			['Subtítulo', 'Описание']
		]],
		['reg', 'form > table tr:nth-child(1) > td', 'não pode ser alterado', 'нельзя изменить'],

		['reg', 'form > table:nth-child(5) th', [
			['Tipo de board', 'Тип доски'],
			[/^Imagens personalizadas(.+)Marcando essa.+/, 'Пользовательские изображения$1Включив эту опцию вы можете использовать кастомные изображения спойлера / нет файла / удалено.<br>Убедитесь в том, что пользовательские изображения загружены, иначе будете получать ошибку 404', [RE_INNER]],
			['Embutir YouTube/Vocaroo', 'Разрешить YouTube/Vocaroo'],
			['Exigir que o OP poste uma imagem', 'При создании нового треда изображение обязательно'],
			['Exigir que o OP crie um assunto', 'При создании нового треда поле "Тема" обязательна'],
			['Mostrar IDs dos usuários', 'Показать ID пользователей'],
			['Mostrar SAGE! em mensagens com sage', 'Показать SAGE! у постов с сажей'],
			[/^Desabilitar caracteres compostos.+/, 'Запретить составные символы ("Zalgo", вьетнамский текст)'],
			[/^Ocultar board(.+)Marcando.+/, 'Скрыть доску$1Если эта опция включена, доска не отображается в списке', [RE_INNER]],
			[/^Habilitar Markup(.+)Códigos como/, 'Разрешить форматирование$1Тэги', [RE_INNER]],
			['Oekaki é um painel javascript que permite o usuário desenhar na hora do post', 'Разрешить пользователю рисовать при создании поста', [RE_INNER]],
			['Formatação matemática entre', 'Форматировать математику между'],
			[/Permitir upload de (.+)/, 'Разрешить загружать $1', [RE_MULTI]],
			[/^Permitir rolar dados\(roll\)/, 'Разрешить бросить кости (roll)'],
			['Proibir usuários de repostar imagens repetidas', 'Запретить отправлять повторяющиеся изображения', [RE_MULTI, RE_NOBREAK]],
			['(em toda a board)', '(по всей доске)'],
			['(no mesmo thread)', '(в том же треде)'],
			['Permitir usuário deletar seu própro post', 'Разрешить пользователю удалить свой пост'],
			['Permitir aos usuários ver se a thread está com o bump bloqueado', 'Разрешить просмотр треда после бамплимита'],
			[/^Habilitar CAPTCHA$/, 'Включить CAPTCHA'],
			['Habilitar CAPTCHA apenas para criação de threads', 'Включить CAPTCHA, только для создания тредов'],
			[/^Bans públicos(.+)Mostrar.+/, 'Публичные баны$1Показывать пользователей которых забанили другие пользователи', [RE_INNER]],
			[/^Histórico de ações público(.+)Mostrar todas as ações ao público/, 'История общественных действий$1Показать все действия общественности', [RE_INNER]], // ???
			['Número máximo de linhas por post', 'Максимальное количество строк на пост'],
			[/^Contador de páginas(.+)Número.+/, 'Счетчик страниц$1Максимальное количество страниц<br>Переходя за этот предел старые треды будут удалены', [RE_INNER]],
			['Limite de bumps', 'Бамплимит'],
			[/^Tamanho mínimo do texto do OP(.+)\(número entre 0 e (\d+), 0 para desativar\)/, 'Минимальный размер текста сообщения$1( от 0 до $2, 0 для отключения )', [RE_INNER]],
			['Extensões de arquivos permitidas', 'Разрешить загружать файлы'],
			[/^Permitir que o OP poste arquivos(.+)Não se aplica a imagens/, 'Разрешить прикреплять файлы к ОП-посту$1Не относится к изображениям', [RE_INNER]],
			['Manter o nome original do arquivo', 'Показывать оригинальные имена файлов'],
			['Limite de imagens por post', 'Максимальное количество прикреплённых файлов к посту']
		]],

		['reg', 'form > table:nth-child(8) th', [
			['Configurações de spam', 'Настройки антиспама', [RE_INNER]],
			[/^Deletar threads sem movimento antecipadamente(.+)Com isso ativo\D+(\d+)\D+(\d+)\D+(\d+).+/, 'Фиксированный список тредов$1При включении этой опции треды, в которых меньше $2 постов при достижении $3 страницы<br>будут перемещены на $4 страницу', [RE_INNER]],
			[/^Limitar números de threads por hora(.+)Serão permitidos.+/, 'Лимит тредов в час$1Количество создаваемых тредов в час, не влияет на количество постов', [RE_INNER]]
		]],
		['reg', 'form > table:nth-child(13) th', [
			['Nome padrão nas postagens', 'Имя по умолчанию'],
			['Anúncio da board', 'Объявления для пользователей'],
			[/^Tema customizado(.+)Permite que.+URLs abaixo(.+)/, 'Настройка темы$1Здесь вы можете задать CSS стили для вашей доски<br>Для внешних изображений можно использовать только на эти домены:$2', [RE_INNER]]
		]],
		['reg', 'form > table:nth-child(13) + p', /A criação ou edição do seu tema.+/, 'После создания и редактирования вашей темы может потребоваться несколько часов, чтобы изменения вступили в силу (из-за cloudflare)'],

		['reg', 'form > table#wf th', [
			['Filtros', 'Фильтры'],
			['Substituir', 'Замещать:'],
			['Por', 'На:'],
		]],
		['reg', 'form > table#tags th', [
			['Tags', 'Тэги'],
			['Descrição', 'Описание']
		]],

		// Тип доски
		['reg', 'select#board_type > option', [
			['Board de imagens', 'Имиджборд'],
			['Board de textos', 'Текстовая'],
			['Board de arquivos', 'Файловая']
		]],

		// Регистрация событий
		['reg', 'select[name="public_logs"] > option', [
			['Desativar', 'Отключено'],
			['Registro completo mas sem o usuário', 'Полная запись, без пользователя'],
			['Registro completo', 'Полная запись']
		]],

		['css', 'select[name="max_newlines"] > option[value="0"], select[name="hour_max_threads"] > option[value="none"]', 'Неограничено'], // Строк на пост, Кол-во тредов в час

		['att', 'input#wf_add', 'value', 'Добавить еще фильтр'],
		['att', 'input#tag_add', 'value', 'Добавить еще тэг'],
		['att', 'input[value="Salvar alterações"]', 'value', 'Сохранить изменения'],		

		['reg', 'body > form > p > a', [
			['Editar banners da board', 'Редактировать баннер доски'],
			['Editar imagens customizadas da board', 'Редактировать изображения'],
			['Editar voluntários', 'Редактировать модераторов'],
			['Editar tags', 'Редактировать тэги']
		]],
		
		[]
	]],

	// Админка - Настройки доски - Пользовательские изображения
	[/^mod\.php\?\/assets\//, [
		['reg', 'head > title, header > h1', 'Edit board assets', 'Редактирование изображений', [RE_MULTI]],

		['reg', 'form > p > small', [
			[/^Todas as imagens padrões.+/, 'Все изображения должны быть в формате PNG или GIF и иметь размер файла не более 500 Кб'],
			[/A imagem deve conter a resolução/, 'Изображение должно иметь разрешение', [RE_MULTI]]
		]],

		['reg', 'form > h2', [
			['Enviar nova imagem de', 'Выбрать изображение для', [RE_MULTI, RE_NOBREAK]],
			['spoiler', 'спойлер'],
			['arquivo deletado', 'файл удален'],
			['sem arquivo', 'нет файла']
		]],
		['reg', 'body > div > form > p', /Imagem de .+ atual/, 'Текущее изображение', [RE_INNER, RE_MULTI]],
		['att', 'input[type="submit"]', 'value', 'Сохранить изображения'],

		[]
	]],

	// Админка - Настройки доски - Модераторы
	[/^mod\.php\?\/volunteers\//, [
		['reg', 'head > title, header > h1', 'Editar voluntários', 'Редактирование модераторов', [RE_MULTI]],
		['reg', 'form > h2', 'Novo usuário', 'Новый модератор'],
		['reg', 'body > div > h2', 'Voluntários atuais', 'Текущие модераторы'],
		['reg', 'form > p > span.unimportant', /Limite de (\d+) voluntários.+/, 'Лимит пользователей: $1.<br>Убедитесь, что используете надежные пароли.<br>Модератор может делать то же, что и админ, за исключением просмотра этой страницы, страницы банеров и страницы настройки доски.', [RE_INNER]],
		
		['reg', 'tbody > tr > th', [
			['Usuário', 'Пользователь'],
			['Senha', 'Пароль']
		]],

		['att', 'body > div > form > p > input[type="submit"]', 'value', [
			['Criar usuário', 'Добавить'],
			['Deletar selecionados', 'Удалить выделенных']
		]]
	]],

	// Админка - Редактирование учетной записи
	[/^mod\.php\?\/users\//, [
		['reg', 'head > title', 'Edit user profile', 'Учетная запись'],
		['reg', 'header > h1', 'Edit user profile', 'Изменение учетной записи'],
		['reg', 'table > tbody > tr > th', [
			[/Usuário(.+)\(alerta:.+/, 'Логин$1(внимание: после изменения имени нужно войти заново,<br>имя в журнале событий также будет заменено на новое)'],
			[/Senha(.+)\(novo.+/, 'Пароль$1(новый; не обязательно)'],
			[/se você esquecer.+para (.+@brchan\.org).+/, 'если вы забыли свой пароль, напишите на $1<br> и попросите его сбросить. Адрес почты должен быть<br>тот же, связанный с учетной записью; по желанию)']
		], [RE_INNER]],
		['att', 'input[type="submit"]', 'value', ['Salvar alterações', 'Сохранить изменения']],
	]],

	// Админка - Бан
	[/^mod\.php\?\/[^/]+\/ban(&delete)?\//, [
		['reg', 'head > title, header > h1', 'Novo ban', 'Новый бан', [RE_MULTI]],
		['reg', 'table > tbody > tr > th > label', [
			[/(IP.+)\(ou subnet\)/, '$1(или подсеть)', [RE_INNER]],
			['Motivo', 'Причина'],
			['Mensagem', 'Сообщение'],
			['Tamanho', 'Длительность']			
		]],
		['reg', 'table > tbody > tr:nth-child(5) > th', 'Board', 'Доска'],
		['reg', 'table > tbody > tr > td .unimportant', [
			[/^Be careful.+/, 'Будьте осторожны с диапазоном адресов. Чем больше диапазон, тем больше пользователей он затронет'],
			['público; anexado à mensagem', 'публичное; добавляется к посту'],
			[/^\(eg.(.+) or (.+)/, '(например: $1 или $2']
		]],
		['reg', 'select[name="range"] > option', [
			['no range ban', 'без диапазона'],
			[/covers (\d+) addresses/, 'охватывает $1 адресов', [RE_MULTI]]
		]],
		['att', 'input#message', 'value', 'Автор этого поста был ЗАБАНЕН'],
		['att', 'input[name="new_ban"]', 'value', 'Забанить']
	]],

	// Админка - Список банов
	[/^mod\.php\?\/bans$/, [
		['reg', 'head > title, header > h1', 'Lista de bans', 'Список банов', [RE_MULTI]],
		['nod', 'div.banlist-opts > div.checkboxes > label', 'Показать только активные баны', [RE_LAST]], // txt, т.к. на input висит обработчик
		['att', 'input#search', 'placeholder', 'Искать...'],
		['att', 'input#unban', 'value', 'Разбанить выделенных'],
		[]
	]],

	// Админка - PM: создание/ответ
	[/^mod\.php\?\/(new_PM\/|PM\/\d+\/reply)/, [
		['reg', 'head > title, header > h1', /Nova MP para (.+)/, 'Личное сообщение для $1', [RE_MULTI]],
		['reg', 'table > tbody > tr > th', [
			['To', 'Кому'],
			['Message', 'Сообщение']
		]],
		['att', 'input[type="submit"]', 'value', ['Enviar mensagem', 'Отправить']]
	]],

	// Админка - PM: просмотр
	[/^mod\.php\?\/PM\/\d+$/, [
		['reg', 'head > title, header > h1', /Mensagem privada (.+)/, 'Личное cообщение $1', [RE_MULTI]],
		['reg', 'table > tbody > tr > th', [
			['De', 'От'],
			['Data', 'Дата'],
			['Mensagem', 'Текст']
		]],
		['reg', 'table > tbody > tr:nth-child(2) > td', [
			[/segundos?/, 'сек'],
			[/minutos?/, 'мин'],
			[/horas?/, 'ч'],
			[/dias?/, 'дн'],
			[/semanas?/, 'нед']
			['ago', 'назад']
		], [RE_INNER, RE_NOBREAK]],
		['att', 'input[name="delete"]', 'value', 'Удалить'],
		['reg', 'form > ul > li > a', 'Responder com citação', 'Ответить с цитированием'],
	]],

	// Админка - PM: входящие
	[/^mod\.php\?\/inbox$/, [
		['reg', 'head > title, header > h1', [
			['Caixa de entrada', 'Входящие', [RE_NOBREAK]],
			[/\((0 unread|empty)\)/, ''],
			[/\((\d+) unread\)/, '(новых: $1)'],
		], [RE_MULTI]],

		['reg', 'table.modlog > tbody > tr > th', [
			['De', 'От'],
			['Data', 'Дата'],
			['Message snippet', 'Первью сообщения']
		]],

		['reg', 'body > p.unimportant', 'No private messages for you.', 'нет новых сообщений', [RE_MULTI]]
	]],

	// Админка - Редактирование поста
	[/^mod\.php\?\/[^/]+\/edit\//, [
		['reg', 'head > title, header > h1', 'Editar mensagem', 'Редактирование сообщения', [RE_MULTI]],
		['reg', 'table > tbody > tr > th', [
			['Nome', 'Имя'],
			['Tripcode', 'Трипкод'],
			['Assunto', 'Тема'],
			['Mensagem', 'Сообщение'],
			['Embutir', 'Вставка'] // ???
		]],
		['reg', 'table > tbody > tr:nth-child(2) > td', 'Remove tripcode', 'Удалить трипкод', [RE_INNER]],
		['att', 'input[name="post"]', 'value', 'Сохранить'],
		['reg', 'form > h2', 'Existing post', 'Существующий пост'],
		[]
	]],


	// Админка - История событий
	[/^mod\.php\?\/log[:]/, [
		['reg', 'head > title, header > h1', 'Histórico da board', 'История событий доски', [RE_MULTI]],
		['reg', 'table.modlog > tbody > tr > th', [
			['Usuário', 'Имя'],
			['Endereço de IP', 'IP-адрес'],
			['Tempo', 'Время'],
			['Board', 'Доска'],
			['Ação', 'Действие']
		]],
		['reg', 'table.modlog > tbody > tr > td:nth-child(2)', 'hidden', 'скрыт', [RE_INNER, RE_MULTI]], // ip
		['reg', 'table.modlog > tbody > tr > td:nth-child(3)', [ // время
			[/segundos?/, 'сек'],
			[/minutos?/, 'мин'],
			[/horas?/, 'ч'],
			[/dias?/, 'дн'],
			[/semanas?/, 'нед']
		], [RE_INNER, RE_MULTI]],
		['reg', 'table.modlog > tbody > tr > td:nth-child(5)', [ // действия.
			[/^Edited post/, 'Редактирование поста'],
			[/^Deleted post/, 'Удаление поста'],
			[/^Stickied thread/, 'Тред закреплен'],
			[/^Unstickied thread/, 'Тред откреплен'],
			[/^Locked thread/, 'Тред закрыт'],
			[/^Unlocked thread/, 'Тред открыт'],
			[/^Bumplocked thread/, 'Запретить поднимать тред'],
			[/^Unbumplocked thread/, 'Разрешить поднимать тред'],
			[/^Made cyclical thread/, 'Циклическая очистка треда включена'],
			[/^Made not cyclical thread/, 'Циклическая очистка треда отключена'],
			[/^Edited board settings/, 'Редактирование настроек доски'],
			[/^Spoilered file from post/, 'Скрыть превью изображения в посте'],
			[/^Deleted file from post/, 'Удаление файла в посте'],
			[/^Removed ban (#\d+) for/, 'Бан снят $1 для'],
			[/^Attached a public ban message to post #(\d+)/, 'Cообщение бана к посту #$1'],
			[/^Created a new (.+) ban on (\/[^/]+\/) for (.+\(#\d+\)) with (no )?reason:?/, "Бан '$1' на доске $2 для $3. Причина: $4"],
			[/^Created a new volunteer/, 'Добавлен новый модератор'],
			[]
		], [RE_MULTI]]
	]],

	// Админка - Последние сообщения
	[/^mod\.php\?\/recent/, [
		['reg', 'head > title, header > h1', 'Mensagens recentes', 'Последние сообщения', [RE_MULTI]],
		['reg', 'body > h4', /Viewing last (\d+) posts/, 'Отображаются последние $1 постов'],
		['reg', 'body > p', /^View/, 'Показывать:', [RE_INNER]],
		['css', 'body > a#erase-local-data', 'Стереть локальные данные'], // wtf?
		['reg', 'body > a[href^="/mod.php?/recent/"]', /Next (\d+) posts/, 'Следующие $1 постов'],
		['reg', 'body > p.unimportant', /\(Não há posts ativos.+/, '(Больше новых сообщений нет)<br><a href="/mod.php?/recent/25">Вернуться</a>', [RE_INNER]],
		[]
	]],

	// Админка - Информация о юзере по IP (посты, баны)
	[/^mod\.php\?\/IP_less/, [
		['css', 'fieldset#bans > legend', 'Баны'],
		['reg', 'fieldset#bans table > tbody > tr > th', [
			['Situação', 'Статус'],
			['Motivo', 'Причина'],
			['Board', 'Доска'],
			['Aplicado', 'Добавлен'],
			['Expira em', 'Истекает'],
			['Visto', 'Виза'], // ???
			['Equipe', 'Выдал'] // ???
		], [RE_MULTI]],

		// статус
		['reg', 'fieldset#bans table tr:nth-child(1) > td', [
			['Ativo', 'Активный'],
			['Expirado', 'Истек']
		], [RE_MULTI]],

		['reg', 'fieldset#bans table tr:nth-child(3) > td', /^sem razão especificada/, '-- не указано --'], // причина
		['reg', 'fieldset#bans table tr:nth-child(6) > td', 'nunca', 'никогда'], // Истекает
		['reg', 'fieldset#bans table tr:nth-child(7) > td', 'Não', 'Нет'], // виза (Equipe)

		['att', 'input[name="unban"]', 'value', 'Разбанить'],

		[]
	]],

	[/^mod\.php\?\/noticeboard/, [
		['reg', 'head > title, header > h1', 'Quadro de noticias', 'Доска объявлений', [RE_MULTI]]
	]],

	[]
];

// ==============================================================================================
// Кнопки модерирования
// ==============================================================================================
replacer.cfg["mod_buttons"] = [
	// Любая доска / тред под модеркой
	[/^mod\.php\?\/[^/]+(|\/|\/.+\.html)/, [
		// кнопки модерирования прикрепленных файлов
		['att', 'div.files span.controls > a', 'title', [
			['Apagar arquivo', 'Удалить файл'],
			['Arquivo spoiler', 'Скрыть превью изображения']
		]],
		// кнопки модерирования оп-поста или поста
		['att', 'div.post.op > p.intro > span.controls.op > a, div.post > span.controls > a', 'title', [
			['Spoiler em tudo', 'Скрыть превью всех изображений'],
			['Apagar todos os posts do IP', 'Удалить все сообщения этого IP'],
			[/^Apagar$/, 'Удалить пост'],
			['Banir e Apagar', 'Забанить и удалить сообщение'],
			[/^Banir$/, 'Забанить'],
			['Editar mensagem', 'Редактировать'],
			['Fixar thread', 'Закрепить тред'],
			['Desafixar thread', 'Открепить тред'],
			['Impedir bump', 'Запретить поднимать тред'],
			['Permitir bump', 'Разрешить поднимать тред'],
			['Trancar thread', 'Закрыть тред'],
			['Destrancar thread', 'Открыть тред'],
			['Make thread cycle', 'Включить циклическую очистку (удаление старых после бамплимита)'],
			['Make thread not cycle', 'Отключить циклическую очистку']
		]],
	], [RE_MULTI]]
];

// ==============================================================================================
// сообщения alert()'ов
// ==============================================================================================
replacer.cfg["alert"] = [
	['', [
		['str', 'Você deve postar com uma imagem', 'Для создания треда нужно прикрепить файл или видео'],
		['str', 'Você errou o codigo de verificação', 'Неверно введен код капчи'],
		['str', 'O corpo do texto é pequeno demais ou inexistente.', 'Введите сообщение'],
		['str', 'Você errou o codigo de verificação', 'Введите сообщение'],
		['str', 'Flood detectado; Sua mensagem foi descartada', 'Ошибка постинга: Вы постите слишком быстро'],
		['str', 'Seu browser enviou uma referência HTTP inválida ou inexistente', 'Ваш браузер послал неверный referer или он отсутствует в заголовке HTTP'],
		['str', 'IP Blocked - Please check', 'IP Заблокирован - проверьте на:'],
		['str', 'Extensão de arquivo desconhecida', 'Неизвестный тип файла'],
		['str', 'Falha ao redimensionar a imagem! Details: Killed', 'Не удалось изменить размер изображения!'],
		['str', 'É necessário inserir um assunto ao criar uma thread nessa board.', 'Вы должны ввести тему при создании треда.'],
		['str', /(O arquivo <a href="(.*)">já existe<\/a> neste tópico!|O arquivo <a href="(.*)">já existe<\/a>!)/, 'Файл уже был загружен в <a href="$2">этом треде!</a>'],
	]]
];

// ==============================================================================================
// сообщения confirm()'ов
// ==============================================================================================
replacer.cfg["confirm"] = [
	['', [
		['str', /Do you wish to remove the (\S+) formatting rule/, 'Вы хотите удалить правило форматирования для "$1"'],
		['str', 'Tem certeza que deseja marcar todas imagens como spoiler?', 'Вы уверены, что хотите скрыть превью всех изображений в посте?'],
		['str', 'Tem certeza que desejar tornar o arquivo spoiler?', 'Вы уверены, что хотите скрыть превью изображеня?'],
		['str', 'Tem certeza que deseja apagar isto?', 'Вы уверены, что хотите удалить это сообщение?'],
		['str', 'Tem certeza que deseja apagar todos os posts deste IP?', 'Вы уверены, что хотите удалить все сообщения этого IP?'],
		['str', 'Tem certeza que deseja apagar este arquivo?', 'Вы уверены, что хотите удалить файл?']
	]]
];

// ==============================================================================================
// перевод постов (начальный перевод + новые)
// ==============================================================================================
replacer.cfg["new_post"] = [
	// любая доска/тред + для некоторых разделов админки (где есть посты)
	[/^(mod\.php\?\/)?[^/]+\/?(|(\d+[^/]*|index)\.html|\/res\/.+)$|^mod\.php\?\/(recent|IP_less)\//, [
		['reg', 'span.name', 'Anônimo', 'Аноним', [RE_INNER]],
		//['reg', 'span.name > span', 'You', 'Вы'],
		['nod', 'p.fileinfo', 'Файл: ', [RE_FIRST]],
		['reg', 'div.body > span.toolong', /Mensagem muito longa\. Clique <a href="(.*)">aqui<\/a> para ver o texto completo\./, '<a href="$1">Показать текст полностью</a>', [RE_INNER]],
		['reg', 'p.intro > a:not([class])', [
			['Responder', 'Ответить'],
			[/^\[Últimas (\d+) Mensagens\]/, '[Последние $1 сообщений]'],
		]],
		['reg', 'div.post > span.omitted', [
			[/(\d+) mensagens e (\d+) respostas? com imagem omitidas?.*/, '$1 пропущено, из них $2 с изображениями. Нажмите ответить, чтобы посмотреть.'],
			[/(\d+) mensage.s? omitidas?.*/, '$1 пропущено. Нажмите ответить, чтобы посмотреть.']
		]]
	], [RE_MULTI]]
];

// ==============================================================================================
// кнопка поиска в каталоге
// ==============================================================================================
replacer.cfg["search_cat"] = [
	['', [
		['reg', 'a#catalog_search_button', [
			['Close', 'Закрыть'],
			['Search', 'Быстрый поиск']
		]]
	]]
];

// ==============================================================================================
// доп. перевод после полной загрузки страницы (после скриптов борды)
// ==============================================================================================
replacer.cfg["page_loaded"] = [
	['', [
		['nod', 'div.boardlist > span > a[href="/tudo"]', 'Все', [RE_LAST]],
		['reg', 'div.options_tab > div > fieldset > legend', [
			['Formatting Options', 'Опции форматирования'],
			['Image hover', 'Всплывающие изображения']
		]]
	]]
];

// ==============================================================================================
// переменные локализации (для скриптов: настройки, быстрый ответ, и т.п.) 
// ==============================================================================================
var l10n_rus = {
	"Style: ": "Стиль: ",
	"File": "Файл",
	"hide": "скрыть",
	"show": "показать",
	"Show locked threads": "Показать закрытые треды",
	"Hide locked threads": "Скрыть закрытые треды",
	"URL": "URL",
	"Select": "Выбрать",
	"Remote": "Ссылка",
	"Embed": "Вставить медиа",
	"Oekaki": "Oekaki",
	"hidden": "скрыто",
	"Show images": "Показать изображения",
	"Hide images": "Скрыть изображения",
	"Password": "Пароль",
	"Delete file only": "Удалить только файл",
	"Delete": "Удалить",
	"Reason": "Причина",
	"Report": "Жалоба",
	"Global report": "Жалоба админам",
	"Click reply to view.": "Нажмите ответ для просмотра",
	"Click to expand": "Нажмите чтобы раскрыть",
	"Hide expanded replies": "Скрыть раскрытые ответы",
	"Brush size": "Размер кисти",
	"Set text": "Текст",
	"Clear": "Очистить",
	"Save": "Сохранить",
	"Load": "Загрузить",
	"Toggle eraser": "Переключить ластик",
	"Get color": "Цвет",
	"Fill": "Заполнить",
	"Use oekaki instead of file?": "Использовать oekaki вместо файла?",
	"Edit in oekaki": "Изменить в oekaki",
	"Enter some text": "Введите текст",
	"Enter font or leave empty": "Введите шрифт или оставить пустым",
	"Forced anonymity": "Анонимное имя вместо пользовательских",
	"enabled": "включено ",
	"disabled": "отключено",
	"Sun": "Вс",
	"Mon": "Пн",
	"Tue": "Вт",
	"Wed": "Ср",
	"Thu": "Чт",
	"Fri": "Пт",
	"Sat": "Сб",
	"Catalog": "Каталог",
	"Submit": "Отправить",
	"Posting mode: Replying to <small>&gt;&gt;{0}<\/small>": "Ответ в <small>&gt;&gt;{0}</small>",
	"Return": "Вернуться",
	"Expand all images": "Развернуть все изображения",
	"Shrink all images": "Свернуть все изображения",
	"Hello!": "Привет!",
	"{0} users": "{0} пользователей",
	"(hide threads from this board)": "(скрыть треды этой доски)",
	"(show threads from this board)": "(показать треды этой доски)",
	"No more threads to display": "Нет больше тредов для отображения",
	"Loading...": "Загрузка...",
	"Save as original filename": "Сохранить оригинальное название",
	"Reported post(s).": "Жалобы на сообщение(я).",
	"An unknown error occured!": "Произошла ошибка.",
	"Something went wrong... An unknown error occured!": "Что то не так... Неизвестная ошибка!",
	"Working...": "Думаю...",
	"Posting... (#%)": "Отправка... (#%)",
	"Posted...": "Отправлено...",
	"An unknown error occured when posting!": "Неизвестная ошибка!",
	"Posting...": "Отправка...",
	"Upload URL": "Загрузить URL",
	"Spoiler Image": "Картинка-спойлер",
	"Comment": "Комментарий",
	"Quick Reply": "Быстрый ответ",
	"Stop watching this thread": "Не следить за тредом",
	"Watch Thread": "Следить за тредом",
	"Watch this thread": "В избранное",
	"Unpin this board": "Открепить доску",
	"Pin this board": "Прикрепить доску",
	"Stop watching this board": "Не следить за доской",
	"Watch this board": "Следить за доской",
	"Click on any image on this site to load it into oekaki applet": "Нажмите на любое изображение на этом сайте, чтобы загрузить его в oekaki апплет",
	"Sunday": "Воскресенье",
	"Monday": "Понедельник",
	"Tuesday": "Вторник",
	"Wednesday": "Среда",
	"Thursday": "Четверг",
	"Friday": "Пятница",
	"Saturday": "Суббота",
	"January": "Январь",
	"February": "Феврась",
	"March": "Март",
	"April": "Апрель",
	"May": "Май",
	"June": "Июнь",
	"July": "Июль",
	"August": "Август",
	"September": "Сентябрь",
	"October": "Октябрь",
	"November": "Ноябрь",
	"December": "Декабрь",
	"Jan": "Янв",
	"Feb": "Фев",
	"Mar": "Мар",
	"Apr": "Апр",
	"Jun": "Июн",
	"Jul": "Июл",
	"Aug": "Авг",
	"Sep": "Sep",
	"Oct": "Окт",
	"Nov": "Ноя",
	"Dec": "Дек",
	"AM": "AM",
	"PM": "PM",
	"am": "am",
	"pm": "pm",
	"Your browser does not support HTML5 video.": "Ваш браузер не поддерживает HTML5 видео.",
	"[play once]": "[один раз]",
	"[loop]": "[по кругу]",
	"WebM Settings": "WebM настройки",
	"Expand videos inline": "Развернуть видео",
	"Play videos on hover": "Проиграть при наведении",
	"Default volume": "Громкость",
	"Tree view": "Просмотр дерева",
	"Animate GIFs": "Анимированная gif-ка",
	"Unanimate GIFs": "Не анимированная gif-ка",
	"WebM": "WebM",
	"No new posts.": "Нет новых постов.",
	"No new threads.": "Нет новых тредов.",
	"There are {0} new threads.": "{0} новых тредов.",
	"There are {0} new posts in this thread.": "{0} новых постов.",
	"Options": "Настройки",
	"General": "Главная",
	"Storage: ": "Хранилище: ",
	"Export": "Экспорт",
	"Import": "Импорт",
	"Paste your storage data": "Вставьте ваши настройки",
	"Erase": "Удалить",
	"Are you sure you want to erase your storage? This involves your hidden threads, watched threads, post password and many more.": "Вы уверены, что хотите стереть сохраненные данные? Они содержат: скрываемые треды, отслеживаемые треды, пароль для постов и многое другое.",
	"User CSS": "User CSS",
	"Update custom CSS": "Update custom CSS",
	"Enter here your own CSS rules...": "Введите сюда CSS-код ваших стилей...",
	"You can include CSS files from remote servers, for example:": "You can include CSS files from remote servers, for example:",
	"User JS": "JS-скрипты",
	"Update custom Javascript": "Update custom Javascript",
	"Enter here your own Javascript code...": "Enter here your own Javascript code...",
	"You can include JS files from remote servers, for example:": "Вы можете подключать JS-файлы с внешних серверов. Например:",
	"Color IDs": "Color IDs",
	"Update": "Обновить",
	"IP address": "IP адрес",
	"Seen": "Seen",
	"Message for which user was banned is included": "Message for which user was banned is included",
	"Message:": "Сообщение:",
	"Board": "Доска",
	"all": "все",
	"Set": "Установлен",
	" ago": " тому назад",
	"Expires": "Истекает",
	"never": "никогда",
	"in ": "через ",
	"Staff": "Сотрудник",
	"system": "system",
	"Auto": "Автообновление",
	"Updating...": "Обновление...",
	"Thread updated with {0} new post(s)": "{0} новых постов",
	"No new posts found": "Нет новых постов",
	"Thread deleted or pruned": "Тред удалён",
	"Error: ": "Ошибка: ",
	"Unknown error": "Неизвестная ошибка",
	"Page": "Страница",
	"All": "Все",
	"second(s)": "секунд(ы)",
	"minute(s)": "минут(ы)",
	"hour(s)": "час(ы)",
	"day(s)": "день(ей)",
	"week(s)": "неделя(ль)",
	"year(s)": "год(ы)",
	"Auto update": "Автообновление",
	"Auto update thread": "Автообновление треда",
	"Show desktop notifications when users quote me": "Показывать уведомления, когда пользователи цитируют меня",
	"Show desktop notifications on all replies": "Показывать уведомления на все ответы",
	"Scroll to new posts": "Прокрутка к новым постам",
	"Verification": "Капча",
	"Enable formatting keybinds": "Включить горячие клавиши",
	"Show formatting toolbar": "Показать панель форматирования",
	"Download All": "Скачать всеl",
	"Hide IDs": "Скрыть ID пользователей",
	"Image hover": "При наведении курсора",
	"Image hover on catalog": "При наведении курсора в каталоге тредов",
	"Image hover should follow cursor": "Всплывать возле курсора",
	"Number of simultaneous image downloads (0 to disable): ": "Количество одновременных загрузок (0 для отключения): ",
	"Error: Invalid LaTeX syntax.": "Error: Invalid LaTeX syntax.",
	"Show relative time": "Показать относительное время",
	"Favorites": "Избранное",
	"Drag the boards to sort them.": "Для сортировки перетаскивайте доски в списке",
	"Note: Most option changes will only take effect on future page loads.": "Примечание: большинство изменений требует перезагрузки страницы.",
	"Theme": "Тема/CSS",
	"Save custom CSS": "Сохранить пользовательский CSS",
	"Board-specific CSS": "Стиль по умолчанию",
	"Style should affect all boards, not just current board": "Применить стиль ко всем доскам, а не только к текущей",
	"These will be applied on top of whatever theme you choose below.": "These will be applied on top of whatever theme you choose below.",
	"Do not paste code here unless you absolutely trust the source or have read it yourself!": "Вставляйте сюда код только если вы абсолютно доверяете источнику или написали его самостоятельно!",
	"Untrusted code pasted here could do malicious things such as spam the site under your IP.": "Ненадежный код может осуществлять вредоностные действия. Например, отправлять спам с вашего IP.",
	"Save custom Javascript": "Сохранить пользовательский скрипт",
	"Enter your own Javascript code here...": "Введите сюда код вашего скрипта...",
	//"(You)": "(Вы)",
	"(You)": "(You)",
	"Use tree view by default": "Использовать TreeView по умолчанию",
	"Show top boards": "Показывать ТОП досок",
	"Loop videos by default": "Бесконечное воспроизведение по умолчанию",
	"YouTube size": "Размер YouTube",
	"OK": "OK",
	"Cancel": "Отмена",
	"Hide post options &amp; limits": "Скрыть опции",
	"Show post options &amp; limits": "Показать опции",
	"Enable gallery mode": "Включить режим галереи",
	"Disable gallery mode": "Выключить режим галереи",
	"Hide post": "Скрывать пост",
	"Add filter": "Фильтровать",
	"Delete post": "Удалить пост",
	"Delete file": "Удалить файл",
	"Enable inlining": "При клике на ответы разворачивать их в посте",
	"Formatting Options": "Настройки форматирования",
	"Add Rule": "Добавить правило",
	"Save Rules": "Сохранить правила",
	"Revert": "Отмена",
	"Reset to Default": "По умолчанию",
	"Prefix": "Префикс",
	"Name": "Имя",

	// дополнительные (не заданные в бразильской локализации). -- /main.js
	"Hide inlined backlinked posts": "Скрыть встроенные ответы",
	"Drag and drop file selection": "Включить перетаскивание файла",
	"If you want to make a redistributable style, be sure to\nhave a Yotsuba B theme selected.": "Если вы хотите сделать распространяемый стиль, убедитесь, что\nвыбрана тема Yotsuba B",
	"Customize Formatting": "Форматирование",
	"Spoiler": "Спойлер",
	"Italics": "Курсив",
	"Bold": "Жирный",
	"Underline": "Поддчеркивание",
	"Code": "Код",
	"Strike": "Зачеркнутый",
	"Heading": "Заголовок",
	"Filters": "Фильтры",
	"Clear all filters": "Очистить все",
	"Add": "Добавить",
	"Tripcode": "Трипкод",
	"Subject": "Тема",
	"watchlist": "Избранное",
	"Unhide post": "Показать скрытый пост",
	"Hide post and all replies" : "Скрыть пост и все ответы на него",
	"Post +": "Пост и все ответы на него",
	"Clear List": "Удалить все",
	"Clear Ghosts": "Очистить",
	"Reply": "Ответить",

	// локализация доски "tudo" ("Все") -- /tudo/ukko.js
	"(esconder threads desta board)": "(скрыть треды этой доски)",
	"(mostrar threads desta board)": "(показать треды этой доски)",
	"Sem mais threads para exibir.": "Нет больше тредов для отображения",
	"Carregando...": "Загрузка...",

	"":""
};

// ==============================================================================================
// replacer functions
// ==============================================================================================

// ----------------------------------------------------
replacer.process = function(cfg, element, debug, debug_rep)
// ----------------------------------------------------
{
	/* 
	произвести замену с использованием конфига с именем cfg
		element - родительский элемент, по умолчанию document
		debug - включить отладку использованных url (по умолчанию == replacer.debug)
		debug_rep - включить детальную отладку реплейсеров 
	*/

	let starttime = Date.now();

	if(!this.debug) {
		// если глобальная отладка запрещена, отключаем местную
		debug = false; 
		debug_rep = false;
	}
	else {
		if(debug === undefined) debug = this.debug;
		if(!debug) debug_rep = false;
	}

	if(!this.cfg[cfg]) {
		con.error("ERROR: CFG NOT FOUND: ", cfg);
		return;
	}

	if(!element) element = doc;
	if(debug) con.group("["+cfg+"]: ", element);

	// в this.instance[] хранится кол-во запусков для каждого конфига (нужно для regex в частности)
	if(!this.instance) this.instance = [];
	if(!this.instance[cfg]) this.instance[cfg] = 0;
	this.instance[cfg]++; 
	this.instanceLocal = this.instance[cfg]; // кол-во запусков текущего конфига

	let re_opt = this.reOpt(); // модификаторы по умолчанию
	re_opt.debug = !!debug_rep; // отладка по умолчанию
	let ucnt = 0;
	let matches = 0;

	for(let u of this.cfg[cfg]) // перебор всех url-групп в заданном конфиге
	{		
		ucnt++;

		if(isArray(u) && !u.length) continue; // empty

		// проверка параметров
		if(!isArray(u) || u.length < 2 || u.length > 3 || !isArray(u[1]) || (u.length == 3 && !isArray(u[2])) ) 
		{
			con.error("ERROR: Syntax: URL-group #"+ucnt+" : ", u);
			if(isArray(u))
				continue;
			else
				break;
		}

		if(!main.url.match(u[0])) continue; // проверка url
		if(debug) con.debug("URL-Match:", u[0]);
		matches++;

		let opt = this.reOpt(u[2], re_opt); // возможное переопределение модификаторов для url-группы
		let recnt = 0;

		for(let r of u[1]) // перебор реплейсеров url-группы
		{
			recnt++;
			if(isArray(r) && !r.length) continue; //empty
			if(!isArray(r) || r.length < 2)
			{
				con.error("ERROR: Syntax: Replacer #"+recnt+" : ", r);
				if(!isArray(r))
					break;
				else
					continue;
			}

			let fn=r[0]+"Replacer";
			if(!this[fn]) // проверка наличия функции реплейсера
			{
				con.error('ERROR: NO Replacer function for:', r);
				continue;
			}
			let err = this[fn](element, r, opt); // вызов функции реплейсера
			if(err < 0)
			{
				con.error("ERROR: Syntax"+err+": Replacer #"+recnt+" : ", r);
				continue;
			}
			else if(err)
				break; // прерывание цикла перебора реплейсеров для текущего url
		}
	}
	if(debug) {
		if(matches)
			con.debug('Relaced in', main.timeDiff(starttime));
		else
			con.debug('No matches');
		con.groupEnd();
	}	
};

// ----------------------------------------------------
replacer.clear = function(cfg)
// ----------------------------------------------------
{
	// очистка заданного конфига
	if(!this.cfg[cfg]) return;
	this.cfg[cfg] = [];
	this.instance[cfg]  = 0;
};

// ----------------------------------------------------
replacer.reOpt = function(re_arr, def)
// ----------------------------------------------------
{
	// re_arr - массив RE_* модификаторов (порядок и кол-во значения не имеет)
	// def - объект опций по умолчанию {prop, single, break, node, debug} 
	// возвращает объект модифицированных опций 

	if(typeof(def) != 'object')
		def = { // новый объект с параметрами по умолчанию
			prop: RE_TEXT,
			single: true,		// RE_SINGLE
			break: true,		// RE_BREAK
			node: 0,			// RE_FIRST
			time: false,		// RE_TIME
			debug: this.debug 	// replacer.debug
		}; 

	if(!isArray(re_arr))
		return def; // возвращаем либо ссылку на дефолтный объект, либо новый объект
	else if(!re_arr.RE)
		re_arr.RE = {}; // добавляем к массиву модификаторов объект для внутренних переменных (для разных нужд)
	
	var opt= { // новый объект опций на основе дефолтного
		prop: def.prop,
		single: def.single,
		break: def.break,
		node: def.node,
		time: def.time,
		debug: def.debug
	}; 

	for(let o of re_arr) {
		switch(o) {
			case RE_SINGLE: opt.single = true; break;
			case RE_MULTI: 	opt.single = false; break;
			case RE_BREAK: 	opt.break = true; break;
			case RE_NOBREAK:opt.break = false; break;
			case RE_FIRST: 	opt.node = 0; break;
			case RE_LAST: 	opt.node = -1; break;
			case RE_TIME: 	opt.time = true; break;
			case RE_DEBUG: 	opt.debug = RE_DEBUG; break;

			case RE_TEXT:
			case RE_INNER:
			case RE_OUTER:
			 	opt.prop = o;
			 	break;
		}
	}
	return opt;
};

/*
// ----------------------------------------------------
 ФУНКЦИИ РЕПЛЕЙСЕРОВ 
 для каждого типа реплейсера должна быть определена функция вида:
 
 replacer.<type>Repacler = function(el, params, re_def) {...}

 где 
 	<type> - тип реплейсера (css, txt, reg и т.п.)
 	el - родительский элемент, в котором нужно производить поиск
 	params - массив параметров (из конфига) ["type", "css-selector", ....]  // type - тип реплейсера, дальше - параметры
 	re_def - объект RE_* модификаторов по умолчанию для текущего реплейсера

возвращаемые значения:
	= 0 : нормальное завершение
	< 0 : ошибка во входных параметрах (в консоль выдаст сообщения со строкой конфига)
	> 0 : прервать перебор реплейсеров для текущей url-группы
*/ 

// ----------------------------------------------------
replacer._regexReplacer = function(rx_arr, re_opt, callback_match)
// ----------------------------------------------------
{
	/*
	универсальная функция проверки значения по группе regex
	
	возвращает: 
		< 0 - в случае ошибки синтаксиса
		false - если не осталось активных regex
		true - в противном случае

	параметры:
		rx_arr - массив regex: [ [regx1, text1, re_arr1], ..., [regxN, textN, re_arrN] ]
		str - строка, в которой будет производиться поиск
		re_opt - объект RE_* модификаторов по умолчанию

		callback_match - внешняя функция для сравнения и подстановки по regex:
			function(rx, str, opt) {...}
				rx - тек. regex;
				str - строка для подстановки;
				opt - объект RE_* модификаторов для тек. regex				
			ф-ция должна вернуть true если regex сработал или false если нет
*/

	let re_cnt = 0; // кол-во активных regex
	let dobreak=false;
	let dbgMsg;

	 // перебор regex
	for(let r of rx_arr) {
		if(!isArray(r) || (r.length && r.length < 2 || r.length > 3) ) { // проверка параметров
			return -3;
		}
		if(!r.length) continue; // empty

		if(!isArray(r[2])) r[2] = []; // массив RE-модификаторов для regex (если нет - создаем пустой)
		let opt = this.reOpt(r[2], re_opt); // переопределение модификаторов для репелейсера
		let RE = r[2].RE;

		if(!RE.instance || RE.instance < this.instanceLocal) // проверка на активный regex
			re_cnt++;
		if(dobreak || RE.instance == this.instanceLocal)
			continue; // продолжаем подсчет активных regex

		dbgMsg = "";

		if(callback_match(r[0], r[1], opt)) {
			dbgMsg += ": FOUND";
			if(opt.single) {
				RE.instance = this.instanceLocal; // выставляем флаг сработавшего regex
				re_cnt--;
				dbgMsg += ": REMOVED";
			}
			if(opt.break) {
				dobreak = true; // прерываем цикл перебора regex
				dbgMsg += ": BREAK";
			}
		}
		else 
			dbgMsg += ": NOT FOUND";

		// if(opt.debug) con.debug("..?: ", [r[0], r[1]], dbgMsg);
		if(opt.debug) con.debug("..?: ", r, dbgMsg);
	} // for r

	if(re_cnt < 1) {
		// прекращаем перебор элементов, т.к. не осталось активных regex
		if(re_opt.debug) con.debug("STOP");
		return false;
	}
	return true;
};

// ----------------------------------------------------
replacer.cssReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/*
	реплейсер контента по заданному селектору
		p=["css", query, text, re_arr]
		
		p=["css", query, [ 
			[sub-query1, text1, re_arr1],
			...
			[sub-queryN, textN, re_arrN]
		], re_arr]

		в расширенном синтаксисе sub-query - селекторы, для дочерних элементов от родительского (найденного по query)
		re_arr - массив RE_* модификаторов [не обязательно]
	*/


	if(p.length < 3 || p.length > 4 || (p.length == 4 && !isArray(p[4])) )
		return -1;

	let elements;
	try {
		elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return;
	}		
	if(!elements.length) return;

	let extended = isArray(p[2]);
	let re_opt = this.reOpt(p[3], re_def); // переопределение модификаторов
	let dbg1st = 0;

	for(let e of elements)
	{
		if(!extended) {
			e[re_opt.prop] = p[2];
			if(re_opt.debug) {
				if(!dbg1st++) con.group("CSS:", p[1], elements.length+" element(s)");
				con.debug("ELM:", e, ' --> ', p[2]);
			}
		} 
		else {
			// расширенный синтаксис
			for(let sp of p[2]) {
				// проверка параметров
				if(!isArray(sp) || sp.length < 2 || sp.length > 3 || (sp.length == 3 && !isArray(sp[2])) ) 
				{ 
					if(!dbg1st++) con.groupEnd();
					return -1;
				}
				let sub;
				try {
					sub = e.querySelectorAll(sp[0]);
				} catch(err) {
					con.error("ERROR: Sub-Selector:", sp[0], p);
				}
				if(!sub || !sub.length) continue;

				let dbg2nd = 0;
				let opt = this.reOpt(sp[2], re_opt); // переопределение модификаторов

				for(let se of sub) { // перебор потомков
					se[opt.prop] = sp[1];
					if(opt.debug) {
						if(!dbg1st++) con.group("CSS:", p[1], elements.length+" element(s)");
						if(!dbg2nd++) con.group("SUB:", sp[0], sub.length+" element(s)");
						con.debug("ELM:", se, ' --> ', sp[1]);
					}
				} 
				if(dbg2nd) con.groupEnd();
			} // for sp
		} // else
	} // for e
	if(dbg1st) con.groupEnd();
};

// ----------------------------------------------------
replacer.attReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/*
	реплейсер атрибута элемента
		p=["att", query, attr_name, text]

		p=["att", query, attr_name, [regex, text, re_arr]]

		p=["att", query, attr_name, [
			[regex1, text1, re_arr1],
			...
			[regexN, textN, re_arrN],
		], re_arr]

		в расширенном синтаксисе значение атрибута проверяется по regex и заменяется при совпадении
		re_arr - массив RE_* модификаторов (RE_SINGLE/MULTI/BREAK/NOBREAK/DEBUG)
	*/

	if(p.length < 4)
		return -1;

	let extended=false;

	if(typeof(p[3]) == "string") { 
		// сокращенный синтаксис (1)		
		if(p.length > 4)
			return -1;
	} 
	else { 
		// расширенный (3)
		if(p.length > 5 || !isArray(p[3]) || !p[3].length || (p.length == 5 && !isArray(p[4])) )
			return -2;
		if(!isArray(p[3][0]))
			p[3] = [p[3]]; // упрощенный синтаксис (2) преобразуем в расширенный
		extended = true;
	}
	
	// выбираем элементы
	let elements;
	try {
		elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return;
	}
	if(!elements.length) return;

	let re_opt = this.reOpt(p[4], re_def); // переопределение модификаторов группы
	let dbg1st = 0;

	for(let e of elements) {
		if(re_opt.debug && !dbg1st++) con.group("ATT:", p[1], " ..? ", [p[2]], elements.length+" element(s)");

		if(!extended) {
			// простой синтаксис
			e.setAttribute(p[2], p[3]);
			if(re_opt.debug) con.debug("ELM:", e, ' --> ', p[3]);
		}
		else {
			// расширенный синтаксис
			if(re_opt.debug) con.debug("ELM:", e);
			let attr = e.getAttribute(p[2]);
			if(!attr) {
				if(re_opt.debug) con.debug("..! NO ATTR"); // атрибут не найден
			}
			else {
				// перебор группы regex
				let ret = this._regexReplacer(p[3], re_opt, function(rx, str, opt) {
					if(attr.match(rx)) {
						attr = attr.replace(rx, str);
						return true;
					}
					return false;
				});

				if(ret < 0) {
					if(dbg1st) con.groupEnd();
					return ret;
				}
				e.setAttribute(p[2], attr);
				if(!ret)
					break;
			}
		}
	}
	if(dbg1st) con.groupEnd();
};


// ----------------------------------------------------
replacer.nodReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/*
	реплейсер текста в дочерних узлах
		p=["nod", query, text, re_arr]

		p=["nod", query, [ 
			[sub-query1, text1, re_arr1],
			...
			[sub-queryN, textN, re_arrN]
		], re_arr]

		в расширенном синтаксисе: sub-query - селекторы, для дочерних элементов от родительского (найденного по query)
		re_arr - массив RE_* модификаторов [не обязательно]:
			RE_FIRST - первая нода [по умолчанию]
			RE_LAST - последняя нода
	*/

	if(p.length < 3 || p.length > 4 || (p.length == 4 && !isArray(p[3])) )
		return -1;

	let elements;
	try {
		elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return;
	}		
	if(!elements.length) return;

	let extended = isArray(p[2]);
	let re_opt = this.reOpt(p[3], re_def); // переопределение модификаторов

	if(re_opt.debug) con.group("NOD:", p[1], elements.length+" element(s)");
	for(let e of elements)
	{
		let node, dmsg;
		if(!extended) {
			if(re_opt.node < 0)
				node = e.lastChild;
			else
				node = e.firstChild;
			dmsg = ': ' + (re_opt.node < 0 ? 'LAST' : 'FIRST') + ' :';
			if(node) {
				if(node.nodeType == Node.ELEMENT_NODE || (node.nodeType == Node.TEXT_NODE && re_opt.prop == RE_TEXT)) {
					if(re_opt.debug) con.debug(e, dmsg, node[re_opt.prop], " --> ", p[2]);
					node[re_opt.prop] = p[2];
				} 
				else
					if(re_opt.debug) con.debug(e, dmsg, node, ': BAD NODE TYPE: #'+node.nodeType);
			}
			else
				if(re_opt.debug) con.debug(e, dmsg, ': NO NODE');
		} 
		else {
			// расширенный синтаксис
			for(let sp of p[2]) {
				if(!isArray(sp) || sp.length < 2 || sp.length > 3 || (sp.length == 3 && !isArray(sp[2]))) // проверка синтаксиса
					return -1;
				let sub;
				try {
					sub = e.querySelectorAll(sp[0]);
				} catch(err) {
					con.error("ERROR: Sub-Selector:", sp[0], p);
				}
				if(!sub || !sub.length) continue;

				let opt = this.reOpt(sp[2], re_opt); // переопределение модификаторов
				if(opt.debug) con.group("SUB:", sp[0], sub.length+" element(s)");
				for(let se of sub) {
					if(opt.node < 0)
						node = se.lastChild;
					else
						node = se.firstChild;
					dmsg = ':' + (opt.node < 0 ? 'LAST' : 'FIRST') + ':';
					if(node) {
						if(node.nodeType == Node.ELEMENT_NODE || (node.nodeType == Node.TEXT_NODE && opt.prop == RE_TEXT)) {
							if(opt.debug) con.debug(se, dmsg, node[re_opt.prop], ' --> ', sp[1]);
							node[opt.prop] = sp[1];
						} 
						else
							if(re_opt.debug) con.debug(se, dmsg, node, ': BAD NODE TYPE: #'+node.nodeType);
					}
					else
						if(opt.debug) con.debug(se, dmsg, ': NO NODE');
				} // for se
				if(opt.debug) con.groupEnd();
			} // for sp
		} // else
	} // for e
	if(re_opt.debug) con.groupEnd();
};

// ----------------------------------------------------
replacer.regReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/* 
	реплейсер контента по regex 
		p=["reg", query, regex, text, re_arr];

		p=["reg", query, [
			[regex1, text1, re_arr1],
			...
			[regexN, textN, re_arrN],
		], re_arr];

		re_arr - массив с комбинацией RE_* параметров [не обязательно]
		внутренние re_arr переопределяют внешние
	*/

	if(p.length < 3 || p.length > 5)
		return -1;

	if(!isArray(p[2])) { // простой синтаксис
		if(p.length == 5 && !isArray(p[4]))
			return -1;
		p.splice(2, 3, [[p[2], p[3], p[4]]]); // преобразуем в расширенный 
	}
	else if(p.length > 4 || !isArray(p[2][0])) // расширенный, проверяем параметры
		return -1;

	let re_opt = this.reOpt(p[3], re_def); // модификаторы по умолчанию для группы regex
	let dbg1st = 0;

	let elements;
	try {
		elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector", p);
		return;
	}
	
	for(let e of elements)
	{
		if(re_opt.debug) {
			if(!dbg1st++) con.group("REG:", p[1], elements.length+" element(s)");
			con.debug("ELM:", e);
		}

		// перебор regex
		let ret = this._regexReplacer(p[2], re_opt, function(rx, str, opt) {
			if(e[opt.prop].match(rx))
			{
				e[opt.prop] = e[opt.prop].replace(rx, str);
				return true;
			}
			return false;
		});


		if(ret < 0) {
			if(dbg1st) con.groupEnd();
			return ret;
		}
		if(!ret)
			break;
	} // for e
	if(dbg1st) con.groupEnd();	
};

// ----------------------------------------------------
replacer.strReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	// реплейсер текста в переданном объекте el {text}
	// p=["str", regex, text]

	if(p.length<3)
		return -1;

	if(el.text.match(p[1])) {
		el.text = el.text.replace(p[1], p[2]);
		//if(re_opt.debug) con.debug("STR:", p, ": FOUND\nSTOP");
		return 1;
	}
	//if(re_opt.debug) con.debug("FND:", p, ": NOT FOUND");
};

// ==============================================================================================
// MAIN
// ==============================================================================================

var main = {
	fn: {}, // для хранения внешних функций
	ru: {
		days: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб','Вс']
	},
	url: win.location.pathname.substr(1) + win.location.search, // текущий URL страницы (без протокола, домена и хэша; начальный слэш удаляется)
	dollStatus: 0, // статус куклы: 0 = отсутствует; -1 = отлкючена; 1 = включена


	// ----------------------------------------------------
	onPageLoaded: function()
	// ----------------------------------------------------
	{
		// сюда помещать код, который должен выполняться после скриптов борды (полной загрузки страницы)
		main.dollGetStatus();

		// доп. перевод
		replacer.process("page_loaded"); 

		// фикс ширины панели избранного
		let el = doc.querySelector('#watchlist');
		if(el) el.style.width = 'auto';	

		// обрабочтик добавления новых постов 
		main.listenNewPosts();

		// обработчик добавления главной формы (для куклы: подгрузка страниц на нулевой)
		main.listenNewForms();

		dbg('Page loaded in ', main.timeDiff(main.starttime));
	},

	// ----------------------------------------------------
	onDocReady: function() 
	// ----------------------------------------------------
	{
		// выполняется после готовности документа (без загрузки ресурсов и запуска скриптов борды)

		main.dollGetStatus();
		dbg('* Doll status:', !main.dollStatus ? "not found" : (main.dollStatus > 0 ? "ON" : "OFF"));

		// перевод всплывающих сообщений alert
		main.fn.alert = win.alert;
		win.alert = function(msg, do_confirm, confirm_ok_action, confirm_cancel_action)
		{
			msg = {text: msg};
			replacer.process("alert", msg, false);

			//dbg(msg.text, do_confirm, confirm_ok_action, confirm_cancel_action);
			main.fn.alert(msg.text, do_confirm, confirm_ok_action, confirm_cancel_action);
		};

		// перевод всплывающих сообщений confirm
		main.fn.confirm = win.confirm;
		win.confirm = function(msg)
		{
			msg = {text: msg};
			replacer.process("confirm", msg, false);
			return main.fn.confirm.call(win, msg.text); // привязка контекста к window - иначе ошибка
		};

		// очистка поля капчи при обновлении
		main.fn.actually_load_captcha = win.actually_load_captcha;
		win.actually_load_captcha = function(provider, extra)
		{
			main.fn.actually_load_captcha(provider, extra);
			for(let el of doc.querySelectorAll('form input[name="captcha_text"]'))
				el.value = "";
		};

		// основной перевод страниц
		replacer.process("main", doc, true);
		replacer.clear("main");
		main.onNewPosts(doc.body); // вызываем обработчик новых постов для всей страницы (перевод + фиксы)
		main.fixCatalog();

		setTimeout(main.onPageLoaded, 0);

		dbg('Pre-translation in ', main.timeDiff(main.starttime));
	},

	// ----------------------------------------------------
	onNewPosts: function(parent)
	// ----------------------------------------------------
	{
		// вызывается при добавлении: нового поста в треде; нового треда в /tudo/; новой главной формы (кукла, подгрузка страниц на нулевой) 
		replacer.process("new_post", parent, false);
		replacer.process("mod_buttons", parent, false);
		main.fixPostDate(parent);
		main.fixRedirect(parent);
		if(parent.id && parent.id.match(/^reply_/))
			main.moveReplies(parent.parentNode); // если это новый пост, обрабатываем весь тред
		else {
			// тред или форма
			main.fixOPImages(parent); 
			main.moveReplies(parent);
		}
	},

	// ----------------------------------------------------
	dollGetStatus: function(de_main)
	// ----------------------------------------------------
	{
		// ищет панель куклы на страницы, обновляет статус в main.dollStatus
		main.dollStatus = 0;
		if(!de_main) {
			de_main = doc.querySelector('div#de-main');
			if(!de_main) return;
		}

		let el = de_main.querySelector('span#de-panel-buttons');
		main.dollStatus = (el && el.children.length > 1) ? 1 : -1; // проверяем статус по кол-ву кнопок
	},

	// ----------------------------------------------------
	listenNewPosts: function(parent)
	// ----------------------------------------------------
	{
		// создать обработчик добавления новых постов в заданный элемент (parent)
		// если parent не задан, ищется первая форма треда на странице
		if(!parent) {
			parent = doc.body.querySelector('form[name="postcontrols"]');
			if(!parent) return;
		}

		let tudo = !!(main.url.match(/^tudo\//));
		//dbg('* Listening posts... /tudo/ is ', tudo);
		let observer = new MutationObserver( function(mutations) {
			// вызываетя при добавлении любых элементов в форму треда
			for(let m of mutations) {
				for(let ch of m.addedNodes) { 
					// перебор добавленных элементов
					if( ch.nodeName == 'DIV' && ch.id && ( (!tudo && ch.id.match(/^reply_/)) || (tudo && ch.id.match(/^thread_/)) ) ) 
						setTimeout(main.onNewPosts, 0, ch); // вызов события для новых постов в треде или треда в tudo
				}
			}
		});

		// запуск обработчика
		if(observer) observer.observe(parent, {attributes: false, childList: true, characterData: false, subtree: true}); // слушать добавление всех элементов (в т.ч. и вложенных)
	},

	// ----------------------------------------------------
	listenNewForms: function()
	// ----------------------------------------------------
	{
		// создать обработчик добавления новых форм тредов (для куклы: подгрузка страниц на нулевой)

		if(main.dollStatus < 1) return;
		if(!main.url.match(/^(mod\.php\?\/)?(?!tudo)[^/]+\/?(|[^/]+\.html)$/)) // любая страница доски, кроме /tudo/
			return;

		// dbg('* Listening forms...');
		let observer = new MutationObserver(function(mutations){
			// вызываетя при добавлении любых элементов в body (прямых потомков)
			for(let m of mutations) {
				for(let ch of m.addedNodes) { 
					//dbg(ch);
					// перебор добавленных элементов, поиск формы
					if(ch.nodeName && ch.nodeName == 'FORM' && ch.getAttribute('name') == 'postcontrols') {
						main.listenNewPosts(ch); // вешаем на форму обработчик добавления постов
						setTimeout(main.onNewPosts, 0, ch); // вызов события для новой формы
					}
				}
			}
		});

		// запуск обработчика
		if(observer) observer.observe(doc.body, {attributes: false, childList: true, characterData: false, subtree: false}); // слушать добавление только прямых потомков
	},

	// ----------------------------------------------------
	fixPostDate: function(parent) 
	// ----------------------------------------------------
	{
		// дата и время постов (перевод + коррекция)
		//if(main.dollStatus > 0) return; // для куклы не нужно

		let t, time = new Date();
		main.arrQuerySelectorAll(parent, 'p.intro time', function(el) {
			if(!(t = el.getAttribute("datetime")))
				return;
			time.setTime(Date.parse(t));
			el.innerText = main.timeFormat(time);
		});
	},

	// ----------------------------------------------------
	fixRedirect: function(parent)
	// ----------------------------------------------------
	{
		// удаление редиректа для внешних ссылок
		let url="http://privatelink.de/?";
		main.arrQuerySelectorAll(parent, 'div.thread a[href^="'+url+'"]', function(el) {
			el.setAttribute("href", el.getAttribute("href").substr(url.length));
		});
	},

	// ----------------------------------------------------
	fixOPImages: function(parent)
	// ----------------------------------------------------
	{
		// Перемещает изображения в ОП посте в сам пост
		//if(main.dollStatus > 0) return; // для куклы не нужно

		main.arrQuerySelectorAll(parent, 'div.post.op', function(op) {
			let files = op.previousElementSibling; // получаем элемент перед div.post.op - д.б. div.files
			if(!files || files.nodeName != 'DIV' || files.className != 'files') 
				return;
			let body = op.getElementsByClassName('body')[0];

			if(files.children.length > 1) {
				files.style.display = 'inline-block';
			}
			else {
				body.style.overflow = 'auto';
				body.parentNode.style.overflow = 'auto'; // На нулевой смещает ответы под оп пост
			}
			body.parentNode.insertBefore(files, body);
		});
	},

	// ----------------------------------------------------
	fixCatalog: function()
	// ----------------------------------------------------
	{
		// фиксы для каталога тредов
		if(!main.url.match(/^[^/]+\/catalog\.html/))
			return;

		// добавить дату создания треда
		let t, time = new Date();
		for(let el of doc.querySelectorAll("div.mix")) 
		{
			if(!(t = el.getAttribute("data-time"))) // дата создания (в GMT+0)
				continue;
			time.setTime(t*1000); 
			if(!(el = el.querySelector("strong"))) 
				continue;
			el.innerHTML = el.innerHTML + "<br><small>"+ main.timeFormat(time, true) + "</small>";
		}

		// кнопка поиска
		replacer.process("search_cat", doc, false);
		let el = doc.querySelector('a#catalog_search_button');
		if(el) {
			// перевод при клике
			doc.addEventListener("click", function() {
				replacer.process("search_cat", doc, false);
			}, false);
		}
	},

	// ----------------------------------------------------
	moveReplies: function(parent)
	// ----------------------------------------------------
	{
		// Переместить ответы вниз поста
		//if(main.dollStatus > 0) return; // для куклы не нужно

		main.arrQuerySelectorAll(parent, 'div.post > p.intro > span.mentioned', function(replies) {

			if(!replies.children || !replies.children.length)
				return;

			//dbg('* Replies moved:', replies.children.length, replies.parentNode.parentNode);

			if(!replies.parentNode.brr_init) {
				// первая обработка поста
				let dsc = doc.createTextNode('Ответы: ');
				replies.insertBefore(dsc, replies.firstChild);
				replies.parentNode.brr_init = true; // p.intro
			}
			for(let i of replies.children) {
				i.style.fontSize = 'inherit';
			}
			replies.parentNode.parentNode.appendChild(replies); // div.post
		});
 	},

	// ----------------------------------------------------
	timeFormat: function(time, isGMT)
	// ----------------------------------------------------
	{
		// возвращает строку с форматированой датой (time - объект Date)
		// isGMT - true если время задано в GMT+0, иначе - время задано в бразильском часовом поясе

		time.setTime(time.getTime() + TIME_CORR*3600000 + (isGMT ? TIME_BR*3600000 : 0)); // коррекция часового пояса

		// формирование строки даты по заданному формату
		let s = "";
		let delim = false;
		for(let c of DATE_FORMAT) {
			if(delim) {
				delim = false;
				switch(c) {
					case 'Y': s += time.getUTCFullYear(); continue; 				// год (4 цифры)
					case 'y': s += time.getUTCFullYear() % 100; continue; 			// год (2 цифры)
					case 'n': s += ("0"+time.getUTCMonth()).substr(-2); continue; 	// месяц (цифрами)
					case 'd': s += ("0"+time.getUTCDate()).substr(-2); continue; 	// день
					case 'w': s += main.ru.days[time.getUTCDay()]; continue; 		// день недели (строка, сокр.)
					case 'h': s += ("0"+time.getUTCHours()).substr(-2); continue; 	// часы
					case 'i': s += ("0"+time.getUTCMinutes()).substr(-2); continue; // минуты
					case 's': s += ("0"+time.getUTCSeconds()).substr(-2); continue; // секунды	

					default: s += '_';
				}
			}
			if(c == '_')
				delim = true;
			else
				s += c;
		}

		return s;
	},
	
	// ----------------------------------------------------
 	timeDiff: function(timestart) 
	// ----------------------------------------------------
	{
		// возвращает строку с разницей между текущим временем и заданным в сек или мс
		let t = (Date.now() - timestart);
		return ((t < 900) ? (t + "ms") : (t/1000 + "s"));
 	},

	// ----------------------------------------------------
	arrQuerySelectorAll: function(arr_el, query, callback)
	// ----------------------------------------------------
	{
		/*
		arr_el - элемент или список элементов (NodeList), для каждого из которых вызывается .querySelectorAll(query)
		callback - функция для обработки всех полученных потомков: function(child)
		если arr_el не задан, подразумевается document
		*/

		if(!arr_el)	
			arr_el = [doc];
		else if(!arr_el.item) 
			arr_el = [arr_el];
		for(let parent of arr_el)
			for(let child of parent.querySelectorAll(query))
				callback(child);
	},

	// ----------------------------------------------------
	init: function()
	// ----------------------------------------------------
	{
		// основная инициализация

		let el = document.head.querySelector('title');
		if(el && el.innerText.match('CloudFlare')) { // не запускаемся на странице с клаудфларой
			dbg('CloudFlare...'); 
			return;
		}

		main.starttime = Date.now();
		con.log("BRchan Russifikator started");
		dbg("URL:", main.url);

		// замена бразильской локализации (подмена переменной l10n)
		Object.defineProperty(win, "l10n", {
			get: function() {
				return l10n_rus;
			}
		});

		if(doc.readyState === 'loading') {
			if(doc.addEventListener) {
				doc.addEventListener("DOMContentLoaded", main.onDocReady, false);
			} else if(doc.attachEvent) {
				doc.attachEvent("onreadystatechange", main.onDocReady); // для ie? а оно надо?
			}
		}
		else
			main.onDocReady();
	}
}; // main

main.init();


//////// wrapper end ////////
})();
////////////////////////////
