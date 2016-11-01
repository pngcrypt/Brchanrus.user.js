// ==UserScript==
// @name            BRchan Rusifikator
// @version         3.3.2
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
*/

////////// wrapper /////////
(function() {
'use strict';
////////////////////////////

const TIME_CORR = 6; // коррекция времени (смещение в часах от бразильского для нужного часового пояса; положительное или отрицательно)
const TIME_BR = -3; // часовой пояс Бразилии (НЕ МЕНЯТЬ!)

// формат вывода времени/даты
// _d - день; _n - месяц (2 цифры); _N - месяц (сокр); _y - год (2 цифры); _Y - год (4 цифры); _w - день недели (сокр.); _h - часы; _i - минуты; _s - секунды
const TIME_FORMAT = {
	0: "_d/_n/_y (_w) _h:_i:_s", // дата + время
	1: "_d/_n/_y", // только дата
	2: "_h:_i:_s", // только время
	3: "_N _d _h:_i" // имя месяца, день, часы, минуты
};

// шаблоны для замены даты в regex, для (:<TN>) - где N - номер паттерна
// in_format - шаблон входного формата (yYnNdhis - указывают положение соотв. цифр даты/времени, пробел == \D+), можно использовать regex
// out_format - формат вывода даты (индекс из TIME_FORMAT)
// in_months - индекс используемого массива TIME_MONTHS - для символа 'N' (по умолчанию 0)
const TIME_PATTERN = {
	0: {in_format: "d n y h i s", out_format: 0},
	1: {in_format: "d n y", out_format: 1}, 
	2: {in_format: "h i s", out_format: 2},
};

// списки названий месяцев для перевода месяца в число (TIME_PATTERN, 'N' в in_format)
const TIME_MONTHS = {
	0: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] // по умолчанию (возможно, Mai - неправильно, хз)
};

const RE_DEBUG = true; // флаг отладки группы или отдельного реплейсера (а также глобальный запрет отладки - если false)

// типы замены контента
const RE_TEXT = 10; // [по умолчанию] текст внутри элемента (все тэги будут удалены)
const RE_INNER = 11; // html код внутри элемента
const RE_OUTER = 12; // hmtl код, включая найденный элемент

// режимы поиска строк по regex
const RE_SINGLE = 20; // [по умолчанию] однократный (после замены regex исключается из дальнейшего поиска)
const RE_MULTI = 21; // многократый (поиск во всех элементах)

// режим прерывания поиска по regex
const RE_NOBREAK = 30; // перебирать все regex независимо от результата (для текущего селектора)
const RE_BREAK = 31; // [по умолчанию] прерывать перебор на первом найденном regex (для текущего селектора)

// выбор дочернего узла (для 'nod')
const RE_FIRST = 40; // [по умолчанию] первая нода
const RE_LAST = 41; // последняя

const RE_TIME = 50; // флаг наличия в regex шаблона для коррекции времени (:<T>...) - подробнее см. в pattern._regexTimeInit

const URL_BREAK = 1000; // флаг для прерывания перебора конфига при совпадении url-regex c url страницы

var _RE_PROP = {};
_RE_PROP[RE_TEXT] = 'textContent';
_RE_PROP[RE_INNER] = 'innerHTML';
_RE_PROP[RE_OUTER] = 'outerHTML';

var replacer = {cfg:[], debug:RE_DEBUG};

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

	для дополнительной проверки можно указать css-селектор любого элемента, который должен присутствовать на странице для данного url-regex
		[url-regex1, "selector1", [ [replacer1.1], ..., [replacer1.N] ], re_arr1],

	где:
		cfg_name - имя создаваемого конфига
		url-regex - regex для проверки текущего URL страницы (если совпадает, то происходит обработка вложенной группы реплейсеров)
		selector - css-селектор (по желанию)
		replacer - массив с параметрами реплейсера (тип, css-селектор и т.п.)
				подробнее синтаксис каждого типа реплейсера см. в функциях реплейсеров (nodReplacer, cssReplacer, regReplacer и т.п.)
		re_arr - массив RE_* модификаторов по умолчанию для всех реплейсеров заданной группы url-regex
			для url-группы можно задавать модификатор URL_BREAK - прерывает дальнейший перебор конфига при совпадении url-regex с текущим url страницы
*/

replacer.cfg["main"] = [

	// любая страница
	[/^/, [
		// Панель меню
		['nod', 'div.boardlist > span.sub > a', [
			['home', 'Главная'],
			['boards', 'Список досок'],
			['board aleatória', 'На случайную доску'],
			['criar board', 'Создать доску'],
			['moderar', 'Админка'],
			['reportar bug', 'Сообщить об ошибке'],
		], [RE_LAST, RE_MULTI]],

		// Техобслуживание
		['reg', 'body > div:nth-child(1) > span:not([class])', [
			['BRchan em manutenção', 'Техобслуживание BRchan'],
			['O Bananal está em manutenção e deve voltar em breve', 'Бананал закрыт на техническое обслуживание и вернется в ближайшее время']
		]],

		['reg', 'body > footer > p:nth-child(2)', /^Tudo que está escrito nesse.+/, 'Все, что написано на этом форуме, является фикцией. Только дурак будет воспринимать это серьезно.']
	]],

	// главная
	[/^/, 'body > div.tabcontents > div#noticias', [
		['css', 'body > div.ban.oficial', [
			['reg', '> h2', [
				['Boards Fixas', 'Постоянные доски'],
				['Exibir todas as boards', 'Посмотреть все доски', [RE_INNER]]
			]],
			['reg', '> ul > li:first-child', [
				['Entretenimento.', 'Развлечения'],
				['Discussão', 'Обсуждение'],
				['Produtividade', 'Производство'],
				['Misc', 'Разное'],
				['Libidinagem', 'Разврат']
			]]
		]],
		['reg', 'body > ul.tabs > li > a', [
			['Notícias', 'Новости'],
			['Sobre', 'О чане'],
			['Regras', 'Правила']
		]],
		['reg', 'div#sobre > div.ban > p', [
			[/^BRchan começou no AnonIB.+/, 'BRchan зародился на AnonIB, но потом переехал в .org, потому что не мог терпеть медленный сервер и большое количество спама. В то время владельцы, TiagoR² и Cogumetal, планировали создать чан с зарегистрированным доменом и собственным сервером, но они так и не сделали этого, так что R сделал то, что модераторы не сделали: организованное строительство первого бразильского .org чана.'],
			[/^Depois de anos de glória.+/, 'После нескольких лет славы и множества бананов, в 2013 г. R. решил закрыть чан по личным причинам. На Рождество 2015 года, чан вернулся с новым администратором Kalinka и новой командой с целью быть более либеральным чаном, в отличие от конкурентов. Здесь мы снова делаем историю.']
		]],
		['css', 'div#global.ban', [
			['reg', '> h2', [
				['REGRAS PARA USO DAS BOARDS OFICIAIS', 'ОФИЦИАЛЬНЫЕ ПРАВИЛА ИСПОЛЬЗОВАНИЯ ДОСОК'],
				['REGRAS PARA CRIAÇÕES DE BOARDS', 'ПРАВИЛА СОЗДАНИЯ ДОСОК'],
				['REGRAS PARA O USO DAS BOARDS SECUNDÁRIAS', 'ПРАВИЛА ИСПОЛЬЗОВАНИЯ ЮЗЕР-ДОСОК']
			]],
			['reg', '> ol > li', [
				// Общие правила досок
				[/^Se você quebrar as regras.+/, 'Если вы нарушите правила, мы удалим ваш пост. Делайте это снова и снова, и мы возьмем hominho назад.'],
				[/^O anonimato prevalecerá sempre/, 'Анонимность превыше всего', [RE_MULTI]],
				[/^Não criem meta-threads/, 'Не создавайте мета-треды'],
				[/^Não queremos saber.+/, 'Мы не хотим знать, что происходит на других имиджбордах.'],
				[/^Não somos mestres.+/, 'Мы не являемся знатоками жаргонных выражений и больше ценим нормальную речь.'],
				[/^A presença da moderação.+/, 'Наличие модерации является социальной конструкцией.'],
				[/^Não toleramos spam.+/, 'Мы не терпим спам, флуд, расчленёнку, детскую порнографию, сексуализацию несовершеннолетних и любые другие незаконные темы.'],
				[/^Argumente com sabedoria.+/, 'Спорьте мудро, игнорируя тролей и флэймы.'],
				[/^Forçadores não terão vez/, 'Силовики не успеют (?)'], // ???
				[/^Você é responsável por seus atos/, 'Вы несете ответственность за свои действия'],
				[/^Leia as regras novamente/, 'Прочитайте правила еще раз'],
				
				// Правила создания досок
				[/^Crie as suas boards.+/, 'Создавайте свои доски ответственно и со здравым смыслом'],
				[/^Anote a senha da sua board.+/, 'Запишите пароль для вашей доски. Администрация не обязана вам его восстанавливать.'],
				[/^É proibida a criação de boards.+/, 'Не создавайте дубликаты досок с одинаковой тематикой.'],
				[/^Mantenha e preserve a sua board.+/, 'Поддерживайте работу своих досок. Старые и заброшенные доски будут удалены.'],
				[/^Não toleramos a criação.+/, 'Мы не потерпим создания досок с оправданием детской порнографии, сексуализации несовершеннолетних и других незаконных тем.'],

				// Правила юзер-досок
				[/^Não toleramos pornografia infantil.+/, 'Мы не потерпим детской порнографии, сексуализации несовершеннолетних, или любые другие беззакония. Анонимность в этом случае не работает.'],
				[/^Valerão as regras.+/, 'Соблюдайте правила, установленные создателем доски']
			]]
		]],

		// Подстановка времени в новостях
		['reg', 'div#noticias > div > h2 > span' , / at (:<T0>)/, ', $T', [RE_TIME, RE_MULTI]],
		[]
	], [URL_BREAK]],

	// Любая доска / тред
	// [/^(mod\.php\?\/)?[^/]+\/?(|(\d+[^/]*|index)\.html|\/res\/.+)$/, [
	[/^(mod\.php\?\/)?[^/]+\/?([^/]+\.html|\/res\/.+|)$/, [
		['reg', 'header > div.subtitle > p > a', /Catálogo|Catalog/, 'Каталог тредов'],
		['css', 'div.banner', [
			['reg', '', 'Modo de postagem: Resposta', 'Форма ответа', [RE_INNER]],
			['reg', 'a', [
				['Voltar', 'Назад'],
				['Ir ao rodapé', 'Вниз страницы']
			]]
		]],

		// Форма ответа
		['css', 'form[name="post"]', [
			['css', 'table.post-table > tbody', [
				['reg', '> tr > th', [
					['Opções', 'Опции'],
					['Assunto', 'Тема/Имя'],
					['Mensagem', 'Сообщение'],
					['Verificação', 'Капча'],
					['Arquivo', 'Файл'],
					['Nome', 'Имя']
				]],
				['css', 'div.file-hint', 'кликни / брось файл сюда'],
				['css', 'span.required-wrap > span.unimportant', '= обязательные поля'],
				['css', 'a.show-post-table-options', '[Показать опции]'],
				['att', '> tr > td > input[type="submit"]', 'value', [
					['Responder', 'Отправить'],
					['Novo tópico', 'Отправить'] // кукла использует эту кнопку для ответов с нулевой
				]],
			]],
			// опции
			['css', 'table.post-table-options > tbody', [
				['reg', '> tr > th', [
					['Embutir', 'Ссылка на видео'],
					['Oekaki', 'Рисовать'],
					['Opções', 'Опции'],
					['Senha', 'Пароль']
				]],
				['reg', 'tr#oekaki > td > a', 'Mostrar oekaki', 'начать'],
				['reg', 'span.unimportant', [
					['substitui arquivos', 'заменяет файл', [RE_MULTI, RE_NOBREAK]],
					['(para remover arquivos e mensagens)', '(для удаления файлов и сообщений)'],
					['(você também pode escrever sage no e-mail)', '(вы также можете писать sage в поле опций)'],
					['(isso substitui a miniatura da sua imagem por uma interrogação)', '(это заменяет превью вашего изображения знаком вопроса)']
				]],
				['reg', 'tr#options-row > td > div > label', [
					['Não bumpar', 'Не поднимать тред (сажа)'],
					['Imagem spoiler', 'Скрыть превью изображения'],
				], [RE_INNER]],
				['reg', 'p.unimportant', /Formatos permitidos:(.+)Tamanho máximo: (.+)Dimensões máximas (.+)Você pode enviar (.+) por mensagem/, 'Разрешенные форматы: $1Максимальный размер файлов: $2Максимальное разрешение: $3Вы можете отправить $4 файла в сообщении', [RE_INNER]],
			]]
		]],

		// Навигация по страницам
		['reg', 'body > div.pages', [
			['Anterior', 'Предыдущая'],
			['Próxima', 'Следующая'],
			['Catálogo', 'Каталог тредов']
		], [RE_INNER, RE_NOBREAK]],

		['css',	'div#thread-interactions', [
			['css',	'a#thread-return',	'[Назад]'],
			['css',	'a#thread-top',		'[Вверх]'],
			['css',	'a#thread-catalog',	'[Каталог тредов]'],
			['css',	'a#link-quick-reply',	'[Ответить]']
		]]
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
		['css', 'body > div', [
			['reg', 'h2', [
				['IP detectado como proxy, proxies nao sao permitidos nessa board. Se voce acha que essa mensagem e um erro entre em contato com a administracao', 'На этом IP обнаружен прокси. Прокси запрещены на этой доске. Если вы считаете, [что произошла ошибка, свяжитесь с администрацией'],
				['Senha incorreta', 'Неверный пароль']
			]],
			['css', 'p > a', 'Назад'],
			['reg', 'a', [
				['Fechar janela', 'Закрыть окно'],
				['Voltar ', 'Назад']
			]]
		]]
	]],

	// Страница каталога доски
	[/^[^/]+\/catalog\.html$/, [
		['reg', 'head > title', 'Catalog', 'Каталог тредов'],
		['nod', 'header > h1', 'Каталог тредов (', [RE_FIRST]],

		['reg', 'body > span', [
			['Ordenar por', 'Сортировка по'],
			['Tamanho da imagem', 'Размер изображений']
		]],

		['css', 'select#sort_by', [
			['css', 'option[value="bump:desc"]', 'Активности'],
			['css', 'option[value="time:desc"]', 'Дате создания'],
			['css', 'option[value="reply:desc"]', 'Кол-ву ответов'],
			['css', 'option[value="random:desc"]', 'Случайная']
		]],

		['css', 'select#image_size', [
			['css', 'option[value="vsmall"]', 'Крошечные'],
			['css', 'option[value="small"]', 'Маленькие'],
			['css', 'option[value="medium"]', 'Средние'],
			['css', 'option[value="large"]', 'Большие']
		]],

		// время в title над пикчей оп-поста (время обновления в каталоге?)
		['att', 'div.thread > a > img[id^="img-"]', 'title', [/(:<T:3>N d h i)/, '$T', [RE_TIME, RE_MULTI]]]

	]],

	// Список досок
	[/^boards\.html/, [
		// Статистика
		['css', 'main > section', [
			['css', 'h2', 'Статистика'],
			['reg', 'p', [
				[/Há atualmente (.+) boards públicas, (.+) no total. Na última hora foram feitas (.+) postagens, sendo que (.+) postagens foram feitas em todas as boards desde/, 'В настоящее время доступно $1 публичных досок из $2. За последнюю минуту написано $3 постов. Высего было написано $4 постов начиная с', [RE_INNER]],
				[/Última atualização desta página: (:<T0::G>)/, 'Последнее обновление страницы: $T', [RE_TIME]]
			]]
		]],

		// Панель поиска
		['css', 'form#search-form', [
			['css', 'h2', 'Поиск'],
			['reg', 'label.search-item.search-sfw', 'Ocultar', 'Скрыть', [RE_INNER]],
			['att', 'input#search-title-input', 'placeholder', 'Поиск названия...'],
			['att', 'input#search-tag-input', 'placeholder', 'Поиск тэгов...'],
			['css', 'button#search-submit', 'Искать']
		]],

		// Таблица списка досок
		['css', 'th.board-uri', 'Доска'],
		['css', 'th.board-title', 'Название'],
		['css', 'th.board-pph', 'п/ч'],
		['css', 'th.board-unique', 'IP за 72ч'],
		['css', 'th.board-tags', 'Тэги'],
		['css', 'th.board-max', 'Постов'],

		['reg', 'td#board-list-more.board-list-hasmore', /^Exibindo resultados de(.+>\d+<.+) a (.+>\d+<.+)no total de(.+>\d+<.+)Click to load more/, 'Показано с $1 по $2 из $3Нажмите чтобы загрузить еще', [RE_INNER]]
	]],

	// Создание доски
	[/^create\.php/, [
		['css', 'head > title, header > h1', 'Создание доски'],
		['css', 'header > div.subtitle', 'создание пользовательской доски'], // ??? antes que alguém a crie

		['css', 'table.modlog > tbody > tr', [
			['reg', '> th', [
				['URI', 'URL'],
				['Título', 'Название'],
				['Subtítulo', 'Описание'],
				['Usuário', 'Логин'],
				['Senha', 'Пароль']
			]],

			['reg', '> td > span', [
				[/letras, números e no máximo (\d+) caracteres/, 'буквы, цифры и не более $1 символов'],
				[/até (\d+) caracteres/, 'до $1 символов', [RE_MULTI]],
				['letras, numeros, pontos e sublinhados', 'буквы, цифры, точки и подчеркивание'],
				['senha para moderar a board, copie-a', 'пароль для модерирования, сохраните его'],
				['opcional,serve para recuperar sua board', 'по желанию, служит для восстановления доски']
			]]
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
		], [RE_INNER]]
	]],

	// багрепорты
	[/^bugs\.php/, [
		['reg', 'head > title', 'BRCHAN :: SUIDB', 'Багрепорт'],
		['css', 'div.ban.oficial', [
			['reg', 'h2', [
				[/^SUIDB.+/, 'Единая Интегрированная Система Сообщений о Багах'],
				[/(\d+) bugs reportados, (\d+) corrigidos/, 'сообщений о багах: $1, исправлено: $2']
			]],
			['reg', 'p', /^O BRchan migrou.+/, 'BRchan перешел на новый движок имиджборд - <b>Infinity</b>. И хоть он и более интерактивный, Infinity имеет огромное количество багов, которые мы готовы исправлять. Если вы нашли один из них, не стесняйтесь сообщить об этом.<br><br><small><i>* Не забывайте, что это бразильская борда и админ вряд ли знает русский язык :)</i></small>', [RE_INNER]],
			['reg', 'form > table > tbody > tr > td', [
				['Descreva o bug encontrado', 'Опишите найденный баг'],
				['Você errou o codigo de verificação', 'Неверный код анти-спама'],
				[/Descreva em pelo menos (\d+) palavras o bug/, 'В описании должно быть не меньше $1 слов(а)'],
				['Digite o código de verificação anti-robôs', 'Введите код анти-спама'],
				['Detalhes', 'Подробности'],
				['Anti-robô', 'Анти-Спам']
			], [RE_INNER]],
			['att', 'form input[type="submit"]', 'value', 'Отправить'],

			// сообщения об отправке
			['css', 'div', [
				['reg', '', 'Obrigado por nos ajudar a melhorar o', 'Благодарим вас за помощь в улучшении', [RE_INNER]],
				['reg', 'h3', 'Seu formulário foi enviado!', 'Ваша форма отправлена!'],
				['reg', 'a', 'Reportar mais bugs', 'Сообщить о других багах']
			]]
		]]
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
		['css', 'fieldset', [
			['reg', 'legend', [
				['Mensagens', 'Сообщения'],
				['Administração', 'Администрирование'],
				['Boards', 'Доски'],
				['Conta de usuário', 'Учетная запись']
			]],
			['css', 'ul > li', [
				['reg', '', 'Quadro de noticias', 'Последние объявления', [RE_INNER]],
				['reg', 'ul > li > small', /^— by (.+) at (:<T0>)/, '— $1, $T', [RE_MULTI, RE_TIME]],
				['reg', 'a', [
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
				['reg', 'span', 'nome de usuário, email, senha', 'имя пользователя, адрес электронной почты, пароль']
			]]
		]]
	]],

	// Админка - Жалобы
	[/^mod\.php\?\/reports\/?$/, [
		['reg', 'head > title, header > h1', /Fila de denuncias\s+\((\d+)\)/, 'Поступившие жалобы ($1)'],
		['reg', 'body > p.unimportant', 'Não há denúncias no momento', 'На данный момент никаких жалоб нет', [RE_SINGLE]],

		['css', 'h2.report-header', [
			['att', 'a', 'title', 'Перейти в тред'],
			['reg', '', [
				[/responder repotado (\d+) vez\(es\)/, 'жалоб на пост: $1'],
				[/thread repotado (\d+) vez\(es\)/, 'жалоб на тред: $1']
			], [RE_INNER]]
		]],

		['reg', 'div.report span.detail-name', 'Data da denúncia', 'Дата поступления'],
		['reg', 'div.report span.detail-value', '(:<T0>)', '$T', [RE_TIME]],
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

		['css', 'form', [
			['reg', 'table:nth-child(2) th', [
				['URI', 'URL'],
				['Título', 'Название'],
				['Subtítulo', 'Описание']
			]],
			['reg', 'table tr:nth-child(1) > td', 'não pode ser alterado', 'нельзя изменить'],

			['reg', 'table:nth-child(5) th', [
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

			['reg', 'table:nth-child(8) th', [
				['Configurações de spam', 'Настройки антиспама', [RE_INNER]],
				[/^Deletar threads sem movimento antecipadamente(.+)Com isso ativo\D+(\d+)\D+(\d+)\D+(\d+).+/, 'Фиксированный список тредов$1При включении этой опции треды, в которых меньше $2 постов при достижении $3 страницы<br>будут перемещены на $4 страницу', [RE_INNER]],
				[/^Limitar números de threads por hora(.+)Serão permitidos.+/, 'Лимит тредов в час$1Количество создаваемых тредов в час, не влияет на количество постов', [RE_INNER]]
			]],
			['reg', 'table:nth-child(13) th', [
				['Nome padrão nas postagens', 'Имя по умолчанию'],
				['Anúncio da board', 'Объявления для пользователей'],
				[/^Tema customizado(.+)Permite que.+URLs abaixo(.+)/, 'Настройка темы$1Здесь вы можете задать CSS стили для вашей доски<br>Для внешних изображений можно использовать только на эти домены:$2', [RE_INNER]]
			]],
			['reg', 'form > table:nth-child(13) + p', /A criação ou edição do seu tema.+/, 'После создания и редактирования вашей темы может потребоваться несколько часов, чтобы изменения вступили в силу (из-за cloudflare)'],

			['reg', 'table#wf th', [
				['Filtros', 'Фильтры'],
				['Substituir', 'Замещать:'],
				['Por', 'На:'],
			]],
			['reg', 'table#tags th', [
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

			['reg', 'p > a', [
				['Editar banners da board', 'Редактировать баннер доски'],
				['Editar imagens customizadas da board', 'Редактировать изображения'],
				['Editar voluntários', 'Редактировать модераторов'],
				['Editar tags', 'Редактировать тэги']
			]]
		]]
	]],

	// Админка - Настройки доски - Пользовательские изображения
	[/^mod\.php\?\/assets\//, [
		['reg', 'head > title, header > h1', 'Edit board assets', 'Редактирование изображений', [RE_MULTI]],

		['css', 'form', [
			['reg', 'p > small', [
				[/^Todas as imagens padrões.+/, 'Все изображения должны быть в формате PNG или GIF и иметь размер файла не более 500 Кб'],
				[/A imagem deve conter a resolução/, 'Изображение должно иметь разрешение', [RE_MULTI]]
			]],

			['reg', 'h2', [
				['Enviar nova imagem de', 'Выбрать изображение для', [RE_MULTI, RE_NOBREAK]],
				['spoiler', 'спойлер'],
				['arquivo deletado', 'файл удален'],
				['sem arquivo', 'нет файла']
			]],
			['reg', 'p', /Imagem de .+ atual/, 'Текущее изображение', [RE_INNER, RE_MULTI]],
			['att', 'input[type="submit"]', 'value', 'Сохранить изображения']
		]]
	]],

	// Админка - Настройки доски - Модераторы
	[/^mod\.php\?\/volunteers\//, [
		['reg', 'head > title, header > h1', 'Editar voluntários', 'Редактирование модераторов', [RE_MULTI]],
		['css', 'body > div', [
			['reg', '> h2', 'Voluntários atuais', 'Текущие модераторы'],
			['css', 'form', [
				['reg', 'h2', 'Novo usuário', 'Новый модератор'],
				['reg', 'p > span.unimportant', /Limite de (\d+) voluntários.+/, 'Лимит пользователей: $1.<br>Убедитесь, что используете надежные пароли.<br>Модератор может делать то же, что и админ, за исключением просмотра этой страницы, страницы банеров и страницы настройки доски.', [RE_INNER]],
				
				['reg', 'tbody > tr > th', [
					['Usuário', 'Пользователь'],
					['Senha', 'Пароль']
				]],
				['att', 'p > input[type="submit"]', 'value', [
					['Criar usuário', 'Добавить'],
					['Deletar selecionados', 'Удалить выделенных']
				]]
			]]
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
		['css', 'table > tbody > tr', [
			['reg', '> th', [
				[/(IP.+)\(ou subnet\)/, '$1(или подсеть)'],
				['Motivo', 'Причина'],
				['Mensagem', 'Сообщение'],
				['Tamanho', 'Длительность'],
				['Board', 'Доска']
			], [RE_INNER]],
			['reg', '> td .unimportant', [
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
		]]
	]],

	// Админка - Список банов
	[/^mod\.php\?\/bans$/, [
		['reg', 'head > title, header > h1', 'Lista de bans', 'Список банов', [RE_MULTI]],
		['nod', 'div.banlist-opts > div.checkboxes > label', 'Показать только активные баны', [RE_LAST]], // txt, т.к. на input висит обработчик
		['att', 'input#search', 'placeholder', 'Искать...'],
		['att', 'input#unban', 'value', 'Разбанить выделенных']
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
		['reg', 'head > title, header > h1', /Mensagem privada (.+)/, 'Личное сообщение $1', [RE_MULTI]],
		['reg', 'table > tbody > tr > th', [
			['De', 'От'],
			['Data', 'Дата'],
			['Mensagem', 'Текст']
		]],
		['reg', 'table > tbody > tr:nth-child(2) > td', [
			[/^(:<T0>)/, '$T', [RE_TIME]], // время сообщения
			[/segundos?/, 'сек'],
			[/minutos?/, 'мин'],
			[/horas?/, 'ч'],
			[/dias?/, 'дн'],
			[/semanas?/, 'нед'],
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
		['reg', 'table.modlog > tbody > tr > td:nth-child(3)', /^(:<T0>)/, '$T', [RE_MULTI, RE_TIME]], // дата сообщения
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
		['css', 'table.modlog > tbody > tr', [
			['reg', '> th', [
				['Usuário', 'Имя'],
				['Endereço de IP', 'IP-адрес'],
				['Tempo', 'Время'],
				['Board', 'Доска'],
				['Ação', 'Действие']
			]],
			['reg', '> td:nth-child(2)', 'hidden', 'скрыт', [RE_INNER, RE_MULTI]], // ip
			['reg', '> td:nth-child(3) > span', [ // время (интервал)
				[/segundos?/, 'сек'],
				[/minutos?/, 'мин'],
				[/horas?/, 'ч'],
				[/dias?/, 'дн'],
				[/semanas?/, 'нед']
			], [RE_MULTI]],
			['att', '> td:nth-child(3) > span', 'title', [/^(:<T0>)/, '$T', [RE_TIME, RE_MULTI]]], // время
			['reg', '> td:nth-child(5)', [ // действия.
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
				[/^User deleted his own post/, 'Пользователь удалил свой пост'],
				[/^Dismissed a report for post/, 'Отказано в жалобе к посту'],
				[/^Re-opened reports for post (#\d+) in local/, 'Повторная местная жалоба к посту $1'],
				[/^Promoted a local report for post/, 'Принята местная жалоба к посту'],
				[]
			], [RE_MULTI]]
		]]
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
		['css', 'fieldset#bans', [
			['css', '> legend', 'Баны'],
			['css', 'table > tbody', [
				['reg', '> tr > th', [
					['Situação', 'Статус'],
					['Motivo', 'Причина'],
					['Board', 'Доска'],
					['Aplicado', 'Добавлен'],
					['Expira em', 'Истекает'],
					['Visto', 'Виза'], // ???
					['Equipe', 'Выдал']
				]],

				// статус
				['reg', '> tr:nth-child(1) > td', [
					['Ativo', 'Активный'],
					['Expirado', 'Истек']
				]],

				['reg', '> tr:nth-child(3) > td', /^sem razão especificada/, '-- не указано --'], // причина
				['reg', '> tr:nth-child(5) > td, > tr:nth-child(6) > td', [
					['nunca', 'никогда'], // Истекает
					['(:<T0>)', '$T', [RE_TIME]], // Время
				]],
				['reg', '> tr:nth-child(7) > td', 'Não', 'Нет'], // виза (Equipe)
			], [RE_MULTI]],
			['att', 'input[name="unban"]', 'value', 'Разбанить']
		]]
	]],

	// Админка - доска объявлений
	[/^mod\.php\?\/noticeboard/, [
		['reg', 'head > title, header > h1', 'Quadro de noticias', 'Доска объявлений', [RE_MULTI]],
		['reg', 'div.ban > h2 > small', /^— por (.+) em (:<T0>)/, '— $1, $T', [RE_MULTI, RE_TIME]] // время объявления
	]],

	// Админка - аппеляции банов
	[/^mod\.php\?\/ban-appeals/, [
		['reg', 'head > title, header > h1', 'Apelos a banimento', 'Аппеляции банов', [RE_MULTI]],
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
	// [/^(mod\.php\?\/)?[^/]+\/?(|(\d+[^/]*|index)\.html|\/res\/.+)$|^mod\.php\?\/(recent|IP_less)\//, [
	[/^(mod\.php\?\/)?[^/]+\/?([^/]+\.html|\/res\/.+|)$|^mod\.php\?\/(recent|IP_less)\//, [
		['att', 'a[href^="http://privatelink.de/?"]', 'href', [/^[^?]+\?(.+)/, "$1"]], // удаление редиректов
		['css', 'p.intro', [
			['reg', '> label > span.name', 'Anônimo', 'Аноним'],
			['reg', '> label > time', /(:<T0>)/, '$T', [RE_TIME]], // время поста
			['reg', '> a:not([class])', [
				['Responder', 'Ответить'],
				[/^\[Últimas (\d+) Mensagens\]/, '[Последние $1 сообщений]'],
				['Ver tudo', 'Показать все']
			]]
		]],
		//['reg', 'span.name > span', 'You', 'Вы'],
		['nod', 'p.fileinfo', '', [RE_FIRST]], // Файл: 
		['reg', 'div.body > span.toolong', /Mensagem muito longa\. Clique <a href="(.*)">aqui<\/a> para ver o texto completo\./, '<a href="$1">Показать текст полностью</a>', [RE_INNER]],

		// кол-во пропущенных ответов + начальное значение счетчика постов
		['reg', 'div.post.op > span.omitted', [
			[/([^>]+)>(\d+) mensage.s? e (\d+) respostas? com imagem omitidas?.*/, '$1 brr-cnt="$2">$2 пропущено, из них $3 с изображениями. Нажмите ответить, чтобы посмотреть.'],
			[/([^>]+)>(\d+) mensage.s? omitidas?.*/, '$1 brr-cnt="$2">$2 пропущено. Нажмите ответить, чтобы посмотреть.']
		], [RE_OUTER]]
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
		['nod', 'div.boardlist > span.favorite-boards > a[href="/tudo"]', 'Все', [RE_LAST]],
		['reg', 'div.options_tab > div > fieldset > legend', [
			['Formatting Options', 'Опции форматирования'],
			['Image hover', 'Всплывающие изображения']
		]],
		['css', 'table.post-table > tbody > tr > td', [
			['css', 'div.format-text > a', 'вставить'],
			['css', 'div.captcha_html', 'кликните сюда для показа']
		]]
	]],

	[/^(mod\.php\?\/)?[^/]+\/?([^/]+\.html|\/res\/.+|)$|^mod\.php\?\/(recent|IP_less)\//, [
		['att', 'div.thread > div.post > p.intro > a.post-btn', 'title', 'Опции']
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
	"Sep": "Сен",
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
	"Expand videos inline": "Разворачивать видео в посте",
	"Play videos on hover": "Воспроизводить при наведении",
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
	"You can include CSS files from remote servers, for example:": "Вы можете подключать CSS-файлы с внешних серверов. Например:",
	"User JS": "JS-скрипты",
	"Update custom Javascript": "Update custom Javascript",
	"Enter here your own Javascript code...": "Enter here your own Javascript code...",
	"You can include JS files from remote servers, for example:": "Вы можете подключать JS-файлы с внешних серверов. Например:",
	"Color IDs": "Color IDs",
	"Update": "Обновить",
	"IP address": "IP адрес",
	"Seen": "Seen",
	"Message for which user was banned is included": "Включая сообщение для забаненого пользователя",
	"Message:": "Сообщение:",
	"Board": "Доска",
	"all": "все",
	"Set": "Установлен",
	" ago": " назад",
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
	"second(s)": "сек",
	"minute(s)": "мин",
	"hour(s)": "час",
	"day(s)": "дн",
	"week(s)": "нед",
	"year(s)": "г",
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
	"These will be applied on top of whatever theme you choose below.": "Эти стили будут применяться до темы, выбранной ниже.",
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
	"Underline": "Подчеркнутый",
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
	"The server took too long to submit your post. Your post was probably still submitted. If it wasn\'t, 8chan might be experiencing issues right now -- please try your post again later. Error information: ": "Сервер долго не подтверждает отправку вашего поста. Вероятнее всего, ваш пост был отправлен. Если нет, значит на сайте временные проблемы, попробуйте позже. Информация об ошибке:",

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

	let re_opt = this.reOpt(); // модификаторы по умолчанию для всего конфига
	re_opt.debug = !!debug_rep; // отладка по умолчанию
	let ucnt = 0,
		matches = 0,
		re_ind, url_err, url_query, recnt, opt;

	for(let u of this.cfg[cfg]) // перебор всех url-групп в заданном конфиге
	{		
		ucnt++;

		if(isArray(u) && !u.length) continue; // empty

		url_err = true;
		url_query = false;
		re_ind = 2; // индекс RE-модификаторов в массиве 
		while(true) {
			// проверка синтаксиса
			if(!isArray(u) || u.length < re_ind)
				break;
			if(typeof(u[1]) == 'string') {
				 // расширенный синтаксис (с доп. проверкой страницы по селектору)
				re_ind = 3;
				url_query = u[1] === "" ? false : u[1]; // пустой селектор пропускаем
			}
			else if(!isArray(u[1]))
				break;
			if( u.length > re_ind+1 || (u.length == re_ind+1 && !isArray(u[re_ind])) ) 
				break;
			url_err = false;
			break;
		}
		if(url_err)
		{
			con.error("ERROR: Syntax: URL-Group #"+ucnt+" : ", u);
			if(isArray(u))
				continue;
			else
				break;
		}

		if(!main.url.match(u[0])) continue; // проверка url
		if(url_query !== false) {
			// доп. проверка страницы по селектору
			try {
				if(!doc.querySelector(url_query))
					continue;
			} 
			catch(e) {
				con.error("ERROR: Bad URL-selector (Group #"+ucnt+") : ", u);
				if(isArray(u))
					continue;
				else
					break;
			}
		}
		if(debug) con.debug("URL-Match #"+ucnt+":", u[0], (url_query ? "Query: '"+url_query+"'" : ""));
		matches++;

		opt = this.reOpt(u[re_ind], re_opt); // возможное переопределение модификаторов для url-группы
		if(!this.RE)
			this.RE = {};

		this.RE.count = 0;
		this.RE.instance = 0;
		this.processReplacers(element, u[re_ind-1], opt);

		if(opt.url_break) {
			if(debug) con.debug("URL-Break #"+ucnt);
			break;
		}
	} // for u
	if(debug) {
		if(matches)
			con.debug('Relaced in', main.timeDiff(starttime));
		else
			con.debug('No matches');
		con.groupEnd();
	}	
};

// ----------------------------------------------------
replacer.processReplacers = function(element, re_arr, opt)
// ----------------------------------------------------
{
	/* 
	обработка массива реплейсеров
		element - родительский элемент
		re_arr - массив рпелейсеров
		opt - объект RE-модификаторов
	*/

	let ret, fn;
	this.RE.instance++;

	for(let r of re_arr) // перебор реплейсеров 
	{
		ret = true;
		this.RE.count++;
		if(isArray(r) && !r.length) continue; //empty
		if(!isArray(r) || r.length < 2)
		{
			con.error("ERROR: Syntax: Replacer #"+this.RE.count+" : ", r);
			if(!isArray(r)) {
				ret = false;
				break;
			}
			else
				continue;
		}

		fn=r[0]+"Replacer";
		if(!this[fn]) // проверка наличия функции реплейсера
		{
			con.error('ERROR: Replacer #'+this.RE.count+' has no function:', r);
			continue;
		}
		ret = this[fn](element, r, opt); // вызов функции реплейсера
		if(ret < 0)
		{
			con.error("ERROR: Syntax"+ret+": Replacer #"+this.RE.count+" : ", r);
			continue;
		}
		else if(!ret)
			break; // прерывание цикла перебора реплейсеров для текущего url
	} // for r

	this.RE.instance--;
	return ret;
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
			prop: _RE_PROP[RE_TEXT], // имя свойства для замены текста в элементе
			single: true,		// RE_SINGLE
			break: true,		// RE_BREAK
			node: 0,			// RE_FIRST
			time: false,		// !RE_TIME
			url_break: false,	// !URL_BREAK
			debug: this.debug 	// RE_DEBUG
		}; 

	if(!isArray(re_arr))
		return def; // возвращаем либо ссылку на дефолтный объект, либо новый объект
	else if(!re_arr.RE)
		re_arr.RE = {}; // добавляем к массиву модификаторов объект для внутренних переменных (для разных нужд)
	
	// новый объект опций на основе дефолтного
	var opt= {}; 
	for(let k of Object.keys(def))
		opt[k] = def[k];

	// замена заданных модификаторов
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
			case URL_BREAK:	opt.url_break = true; break;

			case RE_TEXT:
			case RE_INNER:
			case RE_OUTER:
			 	opt.prop = _RE_PROP[o]; 
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

функция должна вернуть:
	< 0 : ошибка в синтаксисе (в консоль выдаст сообщения со строкой конфига)
	true : продолжить перебор реплейсеров url-группы
	false : прервать перебор реплейсеров url-группы
*/ 

// ----------------------------------------------------
replacer._regexReplacer = function(rx_arr, re_opt, callback_get, callback_set)
// ----------------------------------------------------
{
	/*
	универсальная функция проверки значения по группе regex
	
	возвращает: 
		< 0 - в случае ошибки синтаксиса
		false - если не осталось активных regex (все сработали)
		true - в противном случае

	параметры:
		rx_arr - массив regex: [ [regx1, text1, re_arr1], ..., [regxN, textN, re_arrN] ]
		re_opt - объект RE_* модификаторов по умолчанию

		callback_get - внешняя функция для получения исходной строки для сравнения:
			function(opt) {...}
				opt - объект RE-модификаторов
				функция должна вернуть либо строку для сравнения, либо в случае ошибки объект {msg, err}
					msg - сообщение об ошибке
					err - код ошибки: < 0 - ошибка синтаксиса; false - прервать перебор; true - продолжить перебор

		callback_set - внешняя функция для замены строки:
			function(str, opt) {...}
				str - строка для замены
				opt - объект RE_* модификаторов
*/

	let re_cnt = 0, // кол-во активных regex
		dobreak=false,
		dbgMsg, str, matches, time;

	 // перебор regex
	for(let r of rx_arr) {
		if(!isArray(r) || (r.length && r.length < 2 || r.length > 3) ) { // проверка параметров
			return -3;
		}
		if(!r.length) continue; // empty

		if(!isArray(r[2])) r[2] = []; // массив RE-модификаторов для regex (если нет - создаем пустой)
		let opt = this.reOpt(r[2], re_opt); // переопределение модификаторов для репелейсера
		let RE = r[2].RE; // объект внутренних переменных для тек. regex

		if(!RE.instance || RE.instance < this.instanceLocal) // проверка на активный regex
			re_cnt++;
		if(dobreak || RE.instance == this.instanceLocal)
			continue; // продолжаем подсчет активных regex

		if(opt.time && !RE.time)
			r[0] = this._regexTimeInit(r[0], RE, opt); // regex содержит шаблон времени и он еще не проинициализирован 

		dbgMsg = "";

		str = callback_get(opt); // запрашиваем значение строки для сравнения
		if(typeof(str) != "string") {
			// если вернулась не строка, значит ошибка
			if(str.msg) dbgMsg += ": "+str.msg;
			con.error("..?: ", r, ": ERROR"+dbgMsg);
			if(str.err <= 0)
				return str.err;

		}
		else if( (matches=str.match(r[0])) ) {
			let s_rep = r[1];
			if(RE.time && RE.time.group) {
				// подстановка времени/даты
				if(time === undefined) time = new Date();
				let m = matches[RE.time.group].match(RE.time.catch_rx); // захватываем цифры из найденного совпадения
				if(m) {
					time.setTime(Date.now()); // по умолчанию текущее
					let val;
					for(let i=0; i<RE.time.in_groups.length; i++) {
						val = m[i+1];
						switch(RE.time.in_groups[i]) {
							case 'Y': time.setUTCFullYear(val); break; 
							case 'y': time.setUTCFullYear("20"+val); break; // 2 цифры года преобразуем в 4 (хз как век определять)
							case 'n': time.setUTCMonth(val-1); break; // в js месяцы считаются с 0
							case 'N': time.setUTCMonth(TIME_MONTHS[RE.time.in_months].indexOf(val)); break; // преобразуем название месяца в цифру
							case 'd': time.setUTCDate(val); break;
							case 'h': time.setUTCHours(val);  break;
							case 'i': time.setUTCMinutes(val); break;
							case 's': time.setUTCSeconds(val); break;
						}
					}
					s_rep = s_rep.replace('$T', main.timeFormat(time, RE.time.isGMT, RE.time.out_format)); // в строке замены меняем $T на форматированное время
				}
			}
			callback_set(str.replace(r[0], s_rep), opt); // вызываем внешнюю функцию сохранения измененной строки
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
		} // if str.match
		else 
			dbgMsg += ": NOT FOUND";

		if(opt.debug) con.debug("..?: ", [r[0], r[1]], dbgMsg);
	} // for r

	if(re_cnt < 1) {
		// прекращаем перебор элементов, т.к. не осталось активных regex
		if(re_opt.debug) con.debug("STOP");
		return false;
	}
	return true;
};

// ----------------------------------------------------
replacer._regexTimeInit = function(rx, RE, opt)
// ----------------------------------------------------
{
/* 
	поиск, замена и инициализация шаблона времени в regex
		rx - текущий regex; RE - объект внутренних переменных реплейсера; opt - объект RE-модификаторов реплейсера

	общий вид шаблона:
		(:<TN:M:G>s y m b o l s)

	N - номер предустановленного шаблона. Если задан, то используется шаблон TIME_PATTERN[N]
	M - принудительный вид выходного формата (индекс в TIME_FORMAT)
		если не задан, то выходной формат либо вычисляется (в зависимости от наличия даты/времени),
		либо используется заданный в TIME_PATTERN (при указании номера шаблона (N))
	G - флаг, что время задано в GMT+0 (если не указан, время считается в часовом поясе сайта)

	symbols - набор символов, описывающих формат исходной даты/времени (если номер шаблона (N) не задан)
		спец символы: Y,y,n,N,d,h,i,s (значение аналогично TIME_FORMAT) - они заменяются на \d+ (кроме N - она на \w+)
		пробел подразумевает \D+
		при необходимости можно использовать и другие regex-коды, например: (:<T>d\s+n y) -- сложных конструкций лучше избегать
		скобки внутри шаблона времени недопустимы

	Значения N,M,G - не обязательны, можно выборчно их пропускать, но двоеточие перед пропущенными параметрами - обязательно

	Примеры:
		(:<T>n d y h i s) - шаблон времени и даты с указанием формата внутри него
		(:<T:2>h i s) - шаблон времени с указанием формата, задан принудительно выходной формат 2 (TIME_FORMAT[2])
		(:<T::G>h-i-s) - шаблон времени, время задано в GMT
		(:<T0>) - предустановленный шаблон 0
		(:<T0::G>) - предустановленный шаблон 0, время задано в GMT

	в строке замены дата/время подставляется вместо кода $T
*/

	if(opt.debug) con.debug('Time Init RX:', rx);

	RE.time = {group:0, in_groups: [], catch_rx: "", in_months: 0, out_format: undefined, isGMT: false};
	let brackets = (rx.source || rx).split('('); // разбиваем исходный regex на группы по скобкам (для определения номера группы шаблона)

	for(let i = 1; i < brackets.length; i++) {
		// ищем шаблон времени (:<T>...) в группах, формируем шаблоны поиска и захвата
		brackets[i] = brackets[i].replace(/^:<T(\d+)?(:(\d+)?(:G)?)?>([^)]*)/, function(s, g1, _g2, g3, g4, g5) { 
			// парсинг шаблона
			RE.time.group = i; // номер группы шаблона времени в исходном regex
			let patt = TIME_PATTERN[g1];
			if(g1 && !patt) {
				con.error('Time pattern #"+g1+" NOT FOUND');
				return "TIME-PATTERN-ERROR";
			}
			if(g3) RE.time.out_format = +g3; // принудительно задан выходной формат
			if(g4) RE.time.isGMT = true;
			if(patt) {
				// если указан номер предустановленного шаблона, используем его
				RE.time.out_format = RE.time.out_format === undefined ? patt.out_format : RE.time.out_format;
				if(patt.in_groups) {
					// если шаблон уже проинициализирован, используем запомненные параметры
					RE.time.catch_rx = patt.catch_rx;
					RE.time.in_groups = patt.in_groups;
					RE.time.in_months = patt.in_months;
					if(opt.debug) con.debug('Time pattern:', patt, '; Time Out:', RE.time);
					return patt.find_rx;
				}
				if(opt.debug) con.debug('Time pattern Init:', patt);
				g5 = patt.in_format;
			}
			let skip = false;
			let format = 0; // автоопределение выходного формата (наличие времени и/или даты)
			for(let ch of (g5.source || g5)) {
				// парсинг входного формата
				if(skip) {
					skip = false;
					RE.time.catch_rx += ch;
					continue;
				}
				switch(ch) {
					case ' ':
						RE.time.catch_rx += "\\D+";
						continue;

					case '\\':
						// пропускаем regex коды
						RE.time.catch_rx += ch;
						skip = true;
						continue;

					case 'Y':
					case 'y':
					case 'N':
					case 'n':
					case 'd':
						if(ch == 'N')
							RE.time.catch_rx += "(\\w+)"; // месяц буквами
						else
							RE.time.catch_rx += "(\\d+)"; // число
						format |= 1;
						break;

					case 'h':
					case 'i':
					case 's':
						RE.time.catch_rx += "(\\d+)";
						format |= 2;
						break;

					default:
						RE.time.catch_rx += ch; // остальные символы запоминаем без изменений
						continue;
				}
				RE.time.in_groups.push(ch); // запоминаем символы формата времени в порядке следования	
			}
			let find_rx = RE.time.catch_rx.replace(/[()]/g, ''); // формируем строку поиска из шаблона захвата
			RE.time.catch_rx = new RegExp(RE.time.catch_rx);
			if(RE.time.out_format === undefined)
				RE.time.out_format =  format > 2 ? 0 : format;

			if(patt) {
				// запоминаем параметры в предустановленном шаблоне
				patt.find_rx = find_rx;
				patt.catch_rx = RE.time.catch_rx;
				patt.in_groups = RE.time.in_groups;
				if(opt.debug) con.debug('Time pattern:', patt);
			}
			if(opt.debug) con.debug('Time Out:', RE.time);
			return find_rx; // возвращаем измененный шаблон времени для поиска (\d+\D+...)
		}); // brackets.replace

		if(RE.time.group) 
			break; // возможен всего 1 шаблон времени на regex		
	} // for i

	return new RegExp(brackets.join('(')); // формируем новый regex с замененным шаблоном времени
};

// ----------------------------------------------------
replacer.cssReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/*
	реплейсер контента по заданному селектору
		p=["css", query, text, re_arr]
		
		p=["css", query, [
			[replacer1],
			...
			[replacerN]
		], re_arr]

		в расширенном синтаксисе третьим параметром передается массив вложенных реплейсеров, которые будут применяться к дочернему элементу, найденному по query
		возможна рекурсия - т.е. внутри реплейсеров использовать другие css-реплейсеры с расширенным синтаксисом
		re_arr - массив RE_* модификаторов [не обязательно]

		Пример:
		['css', 'div', [
			['css', 'a.link', 'нажми меня'],			// div a.link  -- обычный css
			['reg', '> span > label', 'test', 'тест'],	// div > span > label
			['css', '> table > tr', [					// div > table > tr -- расширенный css, уровень 2
				['reg', 'th', [							// div > table > tr th
					['header1', 'заголовок1'],
					['header2', 'заголовок2'],
				]],
				['reg', 'td', [							// div > table > tr td
					['line1', 'строка1'],
					['line2', 'строка2'],
				]]
			]]
		]]

		если селектор начинается со знака '>', то выбираются прямые потомки родителя, если нет - то все
	*/


	if(p.length < 3 || p.length > 4 || (p.length == 4 && !isArray(p[3])) )
		return -1;

	let elements;
	try {
		if(p[1] === "")
			elements = [el];
		else
			elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return true;
	}		
	if(!elements.length) return true;

	let extended = isArray(p[2]),
		re_opt = this.reOpt(p[3], re_def), // переопределение модификаторов
		dbg1st = 0,
		ret;

	for(let e of elements)
	{
		ret = true;
		if(re_opt.debug && !dbg1st++) con.group("CSS:", p[1], ":: "+elements.length+" element(s)");
		if(!extended) {
			if(re_opt.debug) con.debug("ELM:", e, ' --> ', p[2]);
			e[re_opt.prop] = p[2];
		} 
		else {
			// расширенный синтаксис
			if(re_opt.debug) con.group("ELM:", e);
			ret = this.processReplacers(e, p[2], re_opt); // вызов обработки вложенных реплейсеров
			if(re_opt.debug) con.groupEnd();
			if(!ret)
				break;
		} // else
	} // for e
	if(dbg1st) con.groupEnd();
	return ret;
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
		re_arr - массив RE_* модификаторов
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
		if(p[1] === "")
			elements = [el];
		else
			elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return true;
	}
	if(!elements.length) return true;

	let re_opt = this.reOpt(p[4], re_def), // переопределение модификаторов группы
		dbg1st = 0,
		ret;

	for(let e of elements) {
		ret = true;
		if(re_opt.debug && !dbg1st++) con.group("ATT:", p[1], " ..? ", [p[2]], ":: "+elements.length+" element(s)");

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
				ret = this._regexReplacer(p[3], re_opt, 
					function(opt) {	return attr; },		// get
					function(str, opt) { attr = str; }	// set
				);
				e.setAttribute(p[2], attr);
				if(ret <= 0)
					break;
			}
		}
	}
	if(dbg1st) con.groupEnd();
	return ret < 0 ? ret : true;
};


// ----------------------------------------------------
replacer.nodReplacer = function(el, p, re_def)
// ----------------------------------------------------
{
	/*
	реплейсер текста в дочерних узлах
		p=["nod", query, text, re_arr]

		p=["nod", query, [ 
			[regex1, text1, re_arr1],
			...
			[regexN, textN, re_arrN]
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
		if(p[1] === "")
			elements = [el];
		else
			elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector:", p);
		return true;
	}		
	if(!elements.length) return true;

	let extended = isArray(p[2]),
		re_opt = this.reOpt(p[3], re_def), // переопределение модификаторов
		node, dmsg,
		ret;

	if(re_opt.debug) con.group("NOD:", p[1], ":: "+elements.length+" element(s)");
	for(let e of elements) {
		ret = true;
		node = re_opt.node < 0 ? e.lastChild : e.firstChild;
		dmsg = ': ' + (re_opt.node < 0 ? 'LAST' : 'FIRST') + ' :';
		if(!node) {
			if(re_opt.debug) con.debug(e, dmsg, ': NO NODE');
			continue;
		}

		if(!extended) {
			// простой синтаксис
			if(node.nodeType != Node.ELEMENT_NODE && !(node.nodeType == Node.TEXT_NODE && re_opt.prop == _RE_PROP[RE_TEXT])) {
				if(re_opt.debug) con.debug(e, dmsg, node, ': BAD NODE TYPE: #'+node.nodeType);
				continue;
			}
			if(re_opt.debug) con.debug(e, dmsg, node[re_opt.prop], " --> ", p[2]);
			node[re_opt.prop] = p[2];
		} 
		else {
			// расширенный синтаксис
			if(re_opt.debug) con.debug("ELM:", e, dmsg, node);
			ret = this._regexReplacer(p[2], re_opt, 
				function(opt) {	// get
					if(node.nodeType != Node.ELEMENT_NODE && !(node.nodeType == Node.TEXT_NODE && opt.prop == _RE_PROP[RE_TEXT]))
						return {msg: 'BAD NODE TYPE: #'+node.nodeType, err: false};
					return node[opt.prop];
				},
				function(str, opt) { node[opt.prop] = str; } // set
			);
			if(ret <= 0)
				break;
		} // else
	} // for e
	if(re_opt.debug) con.groupEnd();
	return ret < 0 ? ret : true;
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

	let re_opt = this.reOpt(p[3], re_def), // модификаторы по умолчанию для группы regex
		dbg1st = 0,
		elements, ret;

	try {
		if(p[1] === "")
			elements = [el];
		else
			elements = el.querySelectorAll(p[1]);
	} catch(err) {
		con.error("ERROR: Selector", p);
		return true;
	}
	
	for(let e of elements)
	{
		ret = true;
		if(re_opt.debug) {
			if(!dbg1st++) con.group("REG:", p[1], ":: "+elements.length+" element(s)");
			con.debug("ELM:", e);
		}

		// перебор regex
		ret = this._regexReplacer(p[2], re_opt, 
			function(opt) {	return e[opt.prop]; },		// get
			function(str, opt) { e[opt.prop] = str; }	// set
		);
		if(ret <= 0)
			break;
	} // for e
	if(dbg1st) con.groupEnd();	
	return ret < 0 ? ret : true;
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
		if(re_def.debug) con.debug("STR:", p, ": FOUND\nSTOP");
		return false;
	}
	if(re_def.debug) con.debug("STR:", p, ": NOT FOUND");
	return true;
};

// ==============================================================================================
// MAIN
// ==============================================================================================

var main = {
	fn: {}, // для хранения внешних функций
	ru: {
		days: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
		months: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
	},
	url: "",
	dollStatus: 0, // статус куклы: 0 = отсутствует; -1 = отлкючена; 1 = включена


	// ----------------------------------------------------
	onPageLoaded: function()
	// ----------------------------------------------------
	{
		// сюда помещать код, который должен выполняться после скриптов борды (полной загрузки страницы)
		main.dollGetStatus();
		dbg('* Doll status:', !main.dollStatus ? "not found" : (main.dollStatus > 0 ? "ON" : "OFF"));

		// доп. перевод
		replacer.process("page_loaded"); 

		if(main.dollStatus < 1) {
			// стиль счетчика постов (контент после номера поста)
			document.styleSheets[0].insertRule('div.thread > div.post.reply > p.intro > a.post_no:not([id])::after {\
				counter-increment: brr-cnt 1;\
				content: " #" counter(brr-cnt);\
				margin: 0 4px 0 2px;\
				vertical-align: 1px;\
				color: #4f7942;\
				font: bold 11px tahoma;\
				cursor: default;\
			}', 0);
		}

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

		let style =  document.styleSheets[0];
		style.insertRule('div.thread p.fileinfo > span.unimportant{display: block;}', 0); // Инфо о файле/файлах сдвинуть под сам файл как на том форуме
		style.insertRule('div.thread > div.post.op{overflow: auto;}', 0); // На нулевой смещает ответы под оп пост
		style.insertRule('div.post > span.mentioned > a, span.postfilename{font-size: inherit;}', 0); // Размер шрифта ответов на пост
		style.insertRule('div.post > span.mentioned{display: inline-block;}', 0);

		setTimeout(main.onPageLoaded, 0);

		dbg('Pre-translation in ', main.timeDiff(main.starttime));
	},

	// ----------------------------------------------------
	onNewPosts: function(parent)
	// ----------------------------------------------------
	{
		// вызывается при добавлении: нового поста в треде; нового треда в /tudo/; новой главной формы (кукла, подгрузка страниц на нулевой) 
		replacer.process("new_post", parent, false); // должно выполняться до initPostCounter
		replacer.process("mod_buttons", parent, false);

		if(parent.id && parent.id.match(/^reply_/))
			main.moveReplies(parent.parentNode); // если это новый пост, обрабатываем весь тред
		else {
			// тред или форма
			main.fixOPImages(parent); 
			main.moveReplies(parent);
			main.initPostCounter(parent);
		}
	},

	// ----------------------------------------------------
	dollGetStatus: function(de_main)
	// ----------------------------------------------------
	{
		// ищет панель куклы на странице, обновляет статус в main.dollStatus
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
					if( ch.nodeName == 'DIV' && ch.id && ( (!tudo && ch.id.match(/^reply_/)) || (tudo && ch.id.match(/^thread_/)) ) ) {
						if(main.dollStatus > 0 && (ch.className.indexOf('de-pview') >= 0)) // пропускаем превью постов для куклы
							continue;
						setTimeout(main.onNewPosts, 0, ch); // вызов события для новых постов в треде или треда в tudo
					}
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
	initPostCounter: function(parent)
	// ----------------------------------------------------
	{
		// инициализация счетчика постов с учетом пропущенных ответов
		if(main.dollStatus > 0)
			return;
		main.arrQuerySelectorAll(parent, 'div.post.op:not([brr-cnt])', function(op) { // обрабатываем все неинициализированные оп-посты			
			let el = op.querySelector('span.omitted[brr-cnt]'); // получаем счетчик пропущенных - атрибут brr-cnt создается при обработке ["new_post"]
			let cnt = 1;
			if(el) {
				cnt = +el.getAttribute('brr-cnt') + 1; // +1 == учитываем оп-пост
				el.removeAttribute('brr-cnt'); 
			}
			op.setAttribute('brr-cnt', cnt); // выставляем атрибут в оп-посте
			op.style.counterReset = "brr-cnt "+cnt; // выставляем в стилях начальное значение счетчика
		});
	},

	// ----------------------------------------------------
	fixOPImages: function(parent)
	// ----------------------------------------------------
	{
		// Перемещает изображения в ОП посте в сам пост

		main.arrQuerySelectorAll(parent, 'div.post.op', function(op) {
			let files = op.previousElementSibling; // получаем элемент перед div.post.op - д.б. div.files
			if(!files || files.nodeName != 'DIV' || (files.className != 'files' && files.className != 'video-container')) 
				return;
			let body = op.getElementsByClassName('body')[0];

			if(files.children.length > 1 && files.className != 'video-container') {
				files.style.display = 'inline-block';
			}
			else {
				body.style.overflow = 'auto';
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
		let el = doc.querySelector('a#catalog_search_button');
		if(el) {
			replacer.process("search_cat", el.parent, false);
			el.addEventListener("click", function() {
				replacer.process("search_cat", el.parent, false); // перевод при клике
			}, false);
		}
	},

	// ----------------------------------------------------
	moveReplies: function(parent)
	// ----------------------------------------------------
	{
		// Переместить ответы вниз поста

		main.arrQuerySelectorAll(parent, 'div.post > p.intro > span.mentioned', function(replies) {

			if(!replies.children || !replies.children.length)
				return;

			if(!replies.parentNode.brr_init) {
				// первая обработка поста
				let dsc = doc.createTextNode('Ответы: ');
				replies.insertBefore(dsc, replies.firstChild);
				replies.parentNode.brr_init = true; // p.intro
			}
			replies.parentNode.parentNode.appendChild(replies); // div.post
		});
 	},

	// ----------------------------------------------------
	timeFormat: function(time, isGMT, format)
	// ----------------------------------------------------
	{
		/*
		 возвращает строку с форматированой датой (time - объект Date)
			isGMT:
				false - время задано в бразильском часовом поясе (по умолчанию)
				true - в GMT+0;
			format - тип формата строки времени (1..3) - см. TIME_FORMAT
		*/

		time.setTime(time.getTime() + TIME_CORR*3600000 + (isGMT ? TIME_BR*3600000 : 0)); // коррекция часового пояса

		// формирование строки даты по заданному формату
		if(format === undefined)
			format = 0;
		if(!(format in TIME_FORMAT))
			return "NO_TIME_FORMAT_#"+format; // ошибка - выходной формат не задан в TIME_FORMAT
		let s = "";
		let delim = false;
		for(let c of TIME_FORMAT[format]) {
			if(delim) {
				delim = false;
				switch(c) {
					case 'Y': s += time.getUTCFullYear(); continue;					// год (4 цифры)
					case 'y': s += time.getUTCFullYear() % 100; continue; 			// год (2 цифры)
					case 'n': s += ("0"+(time.getUTCMonth()+1)).substr(-2); continue; // месяц (цифрами) js считает месяцы с 0
					case 'N': s += main.ru.months[time.getUTCMonth()]; continue;	// месяц (строка, сокр.)
					case 'd': s += ("0"+time.getUTCDate()).substr(-2); continue; 	// день
					case 'w': s += main.ru.days[time.getUTCDay()]; continue;		// день недели (строка, сокр.)
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

		main.url = win.location.pathname.substr(1) + win.location.search; // текущий URL страницы (без протокола, домена и хэша; начальный слэш удаляется)

		let el = doc.head.querySelector('title');
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

		// код для селектора '> ' - выбирает только прямых потомков родителя: element.querySelectorAll('> a')
		['querySelector', 'querySelectorAll'].forEach(function(method) {
			var nativ = Element.prototype[method]; // запоминаем стоковую функцию
			Element.prototype[method] = function(selectors) {
				if(/(^|,)\s*>/.test(selectors)) {
					var id = this.id; // запоминаем реальный id родителя
					var result = null;
					this.id = '_' + Date.now(); // генерируем случайный
					selectors = selectors.replace(/((^|,)\s*)>/g, '$1#' + this.id+' >'); // меняем селектор '> el' на '#id > el'
					try {
						result = nativ.call((this.parentElement || doc), selectors); // ищем элементы у родителя родителя с новым селектором
					} catch(e) {
						// ошибка в селекторе
						this.id = id; // восстанавливаем id 
						throw(e); // пробрасываем ошибку
					}
					this.id = id; // восстанавливаем id
					return result;
				} else {
					return nativ.call(this, selectors); // вызов стоковой функции
				}
			};
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

var win = typeof unsafeWindow != 'undefined' ? unsafeWindow : window;
var con = win.console;
var doc = win.document;
con.debug = con.debug || con.log || function() {};
con.error = con.error || con.log || function() {};
con.group = con.group || function() { con.debug.apply(con, ["[+] -->"].concat(Array.from(arguments))); };
con.groupEnd = con.groupEnd || function() { con.debug('[-] ---'); };

function dbg() { if(RE_DEBUG) con.debug.apply(con, Array.from(arguments)); } // debug messages
function isArray(a) { return Array.isArray(a); }

main.init();

//////// wrapper end ////////
})();
////////////////////////////
