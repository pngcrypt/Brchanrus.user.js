// ==UserScript==
// @name            Brchan Rusifikator
// @version         3.3
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

const TIME_CORR = 3 * 3600000; // коррекция даты постов (в мс)
const TYPE_FIRSTNODE = 0;
const TYPE_LASTNODE = 1;

const RE_DEBUG = true;

// типы замены по regex
const RE_TEXT = 'textContent'; // текст внутри элемента [по умолчанию] (все тэги будут удалены)
const RE_INNER = 'innerHTML'; // html код внутри элемента
const RE_OUTER = 'outerHTML'; // hmtl код, включая найденный элемент

// режимы поиска строк по regex
const RE_SINGLE = 1; // однократный [по умолчанию] (после замены regex исключается из дальнейшего поиска)
const RE_MULTI = 2; // многократый (поиск во всех элементах)

// режим прерывания поиска по regex
const RE_BREAK = 11; // прерывать перебор на первом найденном regex [по умолчанию] (для текущего селектора)
const RE_NOBREAK = 12; // перебирать все regex независимо от результата (для текущего селектора)

var replacer = {cfg:[], debug:RE_DEBUG};

if(!console.debug) console.debug = console.log || function(){};
if(!console.group) 
{
	console.group = function() {
		console.debug.apply(this, ["[+]",">>>"].concat(arguments));
	}
	console.groupEnd = function() {
		console.debug('[-] <<<');
	}
}

// ==============================================================================================
// основной конифг перевода
// ==============================================================================================
replacer.cfg["main"] = [

	[/^/, [
		// Панель меню
		['txt', 'div.boardlist > span > a[href="/"]', TYPE_LASTNODE, ' Главная'],
		['txt', 'div.boardlist > span > a[href="/boards.html"]', TYPE_LASTNODE, ' Список досок'],
		['txt', 'div.boardlist > span > a[href="/random.php"]', TYPE_LASTNODE, ' На случайную доску'],
		['txt', 'div.boardlist > span > a[href="/create.php"]', TYPE_LASTNODE, ' Создать доску'],
		['txt', 'div.boardlist > span > a[href="/mod.php"]', TYPE_LASTNODE, ' Админка'],
		['txt', 'div.boardlist > span > a[href="/bugs.php"]', TYPE_LASTNODE, ' Сообщить об ошибке'],
		['txt', 'div.boardlist > span > a[href="/tudo"]', TYPE_LASTNODE, 'Все'],
		['css', 'body > div > a[title="Opções"]', '[Настройки]'],

		// Техобслуживание
		['reg', 'body > div:nth-child(1) > span:not([class])', [
			['BRchan em manutenção', 'Техобслуживание BRchan'],
			['O Bananal está em manutenção e deve voltar em breve', 'Бананал закрыт на техническое обслуживание и вернется в ближайшее время']
		]],

		[]
	]],

	// Любая доска / тред + для некоторых разделов админки (где отображаются посты)
	[/^(mod\.php\?\/|)\w+(\/?$|\/.+\.html)|^mod\.php\?\/(recent|IP_less)\//, [
		['reg', 'header > div.subtitle > p > a', [/Catálogo|Catalog/, 'Каталог тредов']],
		['reg', 'p.intro > a:not([class])', [
			[/^\[Últimas (\d+) Mensagens/, '[Последние $1 сообщений'],
			['Responder', 'Ответить']
		], [RE_MULTI]],
		['reg', 'div.options_tab > div > fieldset > legend', [
			['Formatting Options', 'Опции форматирования'],
			['Image hover', 'Всплывающие изображения']
		]],

		['reg', 'div.banner', ['Modo de postagem: Resposta', 'Форма ответа', [RE_INNER]]], // ???
		['reg', 'div.banner > a', [
			['Voltar', 'Назад'],
			['Ir ao rodapé', 'Вниз страницы']
		]],

		// Посты
		['txt', 'p.intro > label > span.name', TYPE_FIRSTNODE, 'Аноним'],
		['att', 'p.intro > a.post-btn', "title", 'Опции'],
		['txt', 'p.fileinfo', TYPE_FIRSTNODE, 'Файл: '],
		['css', 'a#link-quick-reply', '[Ответить]'],

		// Форма ответа
		['reg', 'table.post-table > tbody > tr > th', [
			['Nome', 'Имя'],
			['Opções', 'Опции'],
			['Assunto', 'Тема/Имя'],
			['Mensagem', 'Сообщение'],
			['Verificação', 'Капча'],
			['Arquivo', 'Файл']
		]],
		['css', 'table.post-table > tbody > tr > td > div.format-text > a', 'ВСТАВИТЬ'],
		['css', 'table.post-table > tbody > tr > td > div.captcha_html', 'кликните сюда для показа'],
		['css', 'div.file-hint', 'кликни / брось файл сюда'],
		['css', 'span.required-wrap > span.unimportant', '= обязательные поля'],
		['css', 'a.show-post-table-options', '[Показать опции]'],
		['att', 'table.post-table > tbody > tr > td > input[value="Responder"]', 'value', 'Отправить'],
		['att', 'table.post-table > tbody > tr > td > input[value="Novo tópico"]', 'value', 'Создать тред'],
		['css', 'tr#oekaki > th', 'Рисовать'],
		['css', 'tr#upload_embed > th', 'Ссылка на YouTube'],
		['css', 'tr#options-row > th', 'Опции'],
		['reg', 'form > table.post-table-options > tbody > tr > th', ['Senha', 'Пароль']],

		['reg', 'tr#oekaki > td > a', ['Mostrar oekaki', 'начать']],
		['reg', 'table.post-table-options span.unimportant', [
			['substitui arquivos', 'заменяет файл', [RE_NOBREAK]],
			['(para remover arquivos e mensagens)', '(для удаления файлов и сообщений)'],
			['(você também pode escrever sage no e-mail)', '(вы также можете писать sage в поле опций)'],
			['(isso substitui a miniatura da sua imagem por uma interrogação)', '(это заменяет превью вашего изображения знаком вопроса)']
		]],
		['reg', 'tr#options-row > td > div.no-bump-option > label', ['Não bumpar', 'Не поднимать тред (сажа)', [RE_INNER]]],
		['reg', 'tr#options-row > td > div.spoiler-images-option > label', ['Imagem spoiler', 'Скрыть превью изображения', [RE_INNER]]],

		['reg', 'table.post-table-options  p.unimportant', [/Formatos permitidos:(.+)Tamanho máximo: (.+)Dimensões máximas (.+)Você pode enviar (.+) por mensagem/, 'Разрешенные форматы: $1Максимальный размер файлов: $2Максимальное разрешение: $3Вы можете отправить $4 файла в сообщении', [RE_INNER]]],

		// Навигация по страницам
		['reg', 'body > div.pages', [
			['Anterior', 'Предыдущая'],
			['Próxima', 'Следующая'],
			['Catálogo', 'Каталог тредов']
		], [RE_INNER, RE_NOBREAK]],

		['reg', 'div.body > span.toolong', [/Mensagem muito longa\. Clique <a href="(.*)">aqui<\/a> para ver o texto completo\./, 'Сообщение слишком длинное. Нажмите <a href="$1">здесь</a> чтобы увидеть полный текст.', [RE_INNER, RE_MULTI]]],
		['reg', 'div.post > span.omitted', [
			[/(\d+) mensagens e (\d+) respostas? com imagem omitidas?.*/, '$1 пропущено, из них $2 с изображениями. Нажмите ответить, чтобы посмотреть.'],
			[/(\d+) mensage.s? omitidas?.*/, '$1 пропущено. Нажмите ответить, чтобы посмотреть.']
		], [RE_MULTI]],

		['css',	'a#thread-return',	'[Назад]'],
		['css',	'a#thread-top',		'[Вверх]'],
		['css',	'a#thread-catalog',	'[Каталог тредов]'],

		[]
	]],

	// Любой тред
	[/^\w+\/res\//, [
		// добавить линк на нулевую 
		['reg', 'body > header > h1', [/^(\/\w+\/)/, '<a href="../">$1</a>', [RE_INNER]]]
	]],

	// Ошибки постинга
	[/^post\.php/, [
		['reg', 'head > title', [
			['Erro', 'Ошибка'],
			['Denúncia enviada', 'Жалоба отправлена']
		]],

		['reg', 'header > h1', [
			['Erro', 'Ошибка'],
			['Denúncia enviada', 'Жалоба отправлена']
		], [RE_INNER]],

		['reg', 'header > div.subtitle', ['Um erro ocorreu', 'Произошла ошибка']],
		['reg', 'body > div > h2', [
			['IP detectado como proxy, proxies nao sao permitidos nessa board. Se voce acha que essa mensagem e um erro entre em contato com a administracao', 'На этом IP обнаружен прокси. Прокси запрещены на этой доске. Если вы считаете, [что произошла ошибка, свяжитесь с администрацией'],
			['Senha incorreta', 'Неверный пароль']
		]],

		['css', 'body > div > p> a', 'Назад'],

		['reg', 'body > div > a', [
			['Fechar janela', 'Закрыть окно'],
			['Voltar ', 'Назад']
		]],

		[]
	]],

	// Страница каталога доски
	[/^\w+\/catalog\.html$/, [
		['reg', 'head > title', ['Catalog', 'Каталог тредов']],
		['txt', 'header > h1', TYPE_FIRSTNODE, 'Каталог тредов ('],
		['reg', 'body > span', ['Ordenar por', 'Сортировка по']],
		['reg', 'body > span', ['Tamanho da imagem', 'Размер изображений']],

		['css', 'select#sort_by > option[value="bump:desc"]', 'Активности'],
		['css', 'select#sort_by > option[value="time:desc"]', 'Дате создания'],
		['css', 'select#sort_by > option[value="reply:desc"]', 'Кол-ву ответов'],
		['css', 'select#sort_by > option[value="random:desc"]', 'Случайная'],

		['css', 'select#image_size > option[value="vsmall"]', 'Крошечные'],
		['css', 'select#image_size > option[value="small"]', 'Маленькие'],
		['css', 'select#image_size > option[value="medium"]', 'Средние'],
		['css', 'select#image_size > option[value="large"]', 'Большие'],

		[]
	]],

	// Список досок
	[/^boards\.html/, [
		// Статистика
		['css', 'main > section > h2', 'Статистика'],
		['reg', 'main > section > p', [
			[/Há atualmente (.+) boards públicas, (.+) no total. Na última hora foram feitas (.+) postagens, sendo que (.+) postagens foram feitas em todas as boards desde/, 'В настоящее время доступно $1 публичных досок из $2. За последнюю минуту написано $3 постов. Высего было написано $4 постов начиная с', RE_INNER],
			['Última atualização desta página', 'Последнее обновление страницы']
		]],

		// Панель поиска
		['css', 'aside > form > h2', 'Поиск'],
		['reg', 'aside > form label.search-item.search-sfw', ['Ocultar', 'Скрыть', [RE_INNER]]],
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
		['css', 'head > title', 'Создание доски'],
		['css', 'header > h1', 'Создание доски'],
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

		['reg', 'body > div > p > a', ['Voltar', 'Назад']],

		['reg', 'body > p', [
			['Sua board foi criada e está disponível em', 'Ваша доска была создана и доступна по адресу'],
			['Certifique-se de não esquecer a senha de sua board', 'Убедитесь в том, чтобы не забыть пароль к доске'],
			['Você pode gerenciar sua board nessa página', 'Вы можете управлять вашей доской на этой странице']
		], [RE_INNER]],

		[]
	]],

	// Жалоба
	[/^report\.php/, [
		['reg', 'p', [/^Enter reason below/, 'Введите причину жалобы']]
	]],


	// Любая доска / тред под модеркой
	[/^mod\.php\?\/\w+(|\/|\/.+\.html)/, [
		// кнопки модерирования
		['reg', 'span.controls', [
			['Spoiler em tudo', 'Скрыть превью всех изображений'],
			['Arquivo spoiler', 'Скрыть превью изображения'],
			['Apagar todos os posts do IP', 'Удалить все сообщения этого IP'],
			['"Apagar"', '"Удалить пост"'],
			['"Banir"', '"Забанить"'],
			['"Banir e Apagar"', '"Забанить и удалить сообщение"'],
			['Fixar thread', 'Закрепить тред'],
			['Desafixar thread', 'Открепить тред'],
			['Impedir bump', 'Запретить поднимать тред'],
			['Permitir bump', 'Разрешить поднимать тред'],
			['Trancar thread', 'Закрыть тред'],
			['Destrancar thread', 'Открыть тред'],
			['Make thread cycle', 'Включить циклическую очистку (удаление старых после бамплимита)'],
			['Make thread not cycle', 'Отключить циклическую очистку'],
			['Editar mensagem', 'Редактировать'],
			['Apagar arquivo', 'Удалить файл'],

			['Tem certeza que deseja marcar todas imagens como spoiler?', 'Вы уверены, что хотите скрыть превью всех изображений в посте?'],
			['Tem certeza que desejar tornar o arquivo spoiler?', 'Вы уверены, что хотите скрыть превью изображеня?'],
			['Tem certeza que deseja apagar isto?', 'Вы уверены, что хотите удалить это сообщение?'],
			['Tem certeza que deseja apagar todos os posts deste IP?', 'Вы уверены, что хотите удалить все сообщения этого IP?'],
			['Tem certeza que deseja apagar este arquivo?', 'Вы уверены, что хотите удалить файл?'],
		], [RE_INNER, RE_MULTI, RE_NOBREAK]],

		[]
	]],

	// Админка - логин / ошибки
	[/^mod\.php\b/, [
		['reg', 'head > title', ['Login', 'Вход']],
		['reg', 'header > h1', ['Login', 'Вход']],
		['reg', 'body > form > table:nth-child(1) th', [
			['Usuário', 'Логин'],
			['Senha', 'Пароль']
		]],
		['att', 'input[name="login"]', 'value', 'Войти'],

		// Панель уведомлений
		['reg', 'body > div.top_notice:first-child', [
			[/You have(.+)an unread PM/, 'У вас есть$1Новые сообщения', [RE_INNER]]
		]],

		// Ошибки
		['reg', 'head > title', ['Erro', 'Ошибка']],
		['reg', 'header > h1', ['Erro', 'Ошибка', [RE_INNER]]],
		['reg', 'body > h2', [/Login e\/ou senha inválido\(s\)/, 'Неверный логин или пароль']],
		['reg', 'header > div.subtitle', ['Um erro ocorreu', 'Произошла ошибка']],
		['reg', 'body > div > h2', [
			['Pagina não encontrada', 'Страница не найдена'],
			['Login e/ou senha inválido', 'Неверный логин или пароль'],
			['Banner editing is currently disabled. Please check back later', 'Редактирование баннера отключено. Попробуйте позже'],
			['Usuário inválido', 'Неверное имя пользователя'],
			['Board inválida', 'Доска не существует'],
			['Você não tem permissão para fazer isso', 'У вас нет прав доступа к этой странице'],
			[]
		]],

		['reg', 'div.subtitle > p > a', ['Voltar à dashboard', 'Назад к панели управления']],
		['reg', 'body > div > p > a', ['Voltar', 'Назад']],

		[]
	]],

	// Админка - Главная
	[/^mod\.php\?\/$/, [
		['reg', 'head > title', ['Dashboard', 'Панель администрирования']],
		['reg', 'header > h1', ['Dashboard', 'Панель администрирования']],
		['reg', 'fieldset > legend', [
			['Mensagens', 'Сообщения'],
			['Administração', 'Администрирование'],
			['Boards', 'Доски'],
			['Conta de usuário', 'Учетная запись']
		]],
		['reg', 'fieldset > ul > li', ['Quadro de noticias', 'Доска объявлений', [RE_INNER]]],
		['reg', 'fieldset > ul > li > ul > li > a', ['Comunicado', 'Коммуникация']],
		['reg', 'fieldset > ul > li > a', [
			['Ver todas as noticias do quadro de noticias', 'Просмотр всех новостей'],
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
		['reg', 'fieldset > ul > li > span', ['nome de usuário, email, senha', 'имя пользователя, адрес электронной почты, пароль']],

		[]
	]],

	// Админка - Жалобы
	[/^mod\.php\?\/reports\/?$/, [
		['reg', 'head > title', [/Fila de denuncias\s+\((\d+)\)/, 'Поступившие жалобы ($1)']],
		['reg', 'header > h1', [/Fila de denuncias \((\d+)\)/, 'Поступившие жалобы ($1)']],
		['att', 'h2.report-header > a', 'title', 'Перейти в тред'],
		['reg', 'h2.report-header', [
			[/responder repotado (\d+) vez\(es\)/, 'жалоб на пост: $1'],
			[/thread repotado (\d+) vez\(es\)/, 'жалоб на тред: $1']
		], [RE_INNER]],

		['reg', 'ul.report-actions > li.report-action > a', [
			['Dismiss', 'Отклонить'],
			['Promote', 'Принять']
		], [RE_MULTI]],
		// TODO: title для Dismiss/Promote

		['reg', 'ul.report-content-actions > li.report-content-action', [/Descartar todas denúncias a esse conteúdo(.+)Dismiss All/, 'Отклонить все жалобы к этому посту$1Отклонить все', [RE_INNER]]],
		['reg', 'ul.report-content-actions > li.report-action', [/Promover todas denúncias locais para globais(.+>)Promote All/, 'Передать все жалобы к этому посту в глобальные$1Принять все', [RE_INNER]]],
		['reg', 'ul.report-content-actions > li.report-content-action', [/Clean(.+)Ignorar e descartar denúncias locais dessa mensagem nessa board/, 'Очистить$1Игнорировать и удалить все местные жалобы в этом треде', [RE_INNER]]], // "

		['reg', 'body > p.unimportant', ['Não há denúncias no momento', 'На данный момент никаких жалоб нет']],

		[]
	]],

	// Админка - Настройка доски
	[/^mod\.php\?\/settings\//, [
		['reg', 'head > title', ['Configuração da board', 'Настройки доски']],
		['reg', 'header > h1', ['Configuração da board', 'Настройки доски']],
		['css', 'body > p', 'Внимание: Некоторые изменения не вступят в силу до тех пор, пока не будет написан новый пост на доске.'],

		['reg', 'form > table:nth-child(2) th', [
			['URI', 'URL'],
			['Título', 'Название'],
			['Subtítulo', 'Описание']
		]],
		['reg', 'form > table tr:nth-child(1) > td', ['não pode ser alterado', 'нельзя изменить']],

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
			['Permitir upload de SWF', 'Разрешить загружать SWF'],
			['Permitir upload de PDF', 'Разрешить загружать PDF'],
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
			['Manter o nome original do arquivo', 'Показывать оригинальное имя файла'],
			['Limite de imagens por post', 'Максимальное количество изображений в посте']
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
		['reg', 'form > table:nth-child(13) + p', [/A criação ou edição do seu tema.+/, 'После создания и редактирования вашей темы может потребоваться несколько часов, чтобы изменения вступили в силу (из-за cloudflare)']],

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

		['css', 'select[name="max_newlines"] > option[value="0"]', 'Неограничено'], // Строк на пост
		['css', 'select[name="hour_max_threads"] > option[value="none"]', 'Неограничено'], // Кол-во тредов в час

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
		['reg', 'head > title', ['Edit board assets', 'Редактирование изображений']],
		['reg', 'header > h1', ['Edit board assets', 'Редактирование изображений']],

		['reg', 'form > p > small', [
			[/^Todas as imagens padrões.+/, 'Все изображения должны быть в формате PNG или GIF и иметь размер файла не более 500 Кб'],
			[/A imagem deve conter a resolução/, 'Изображение должно иметь разрешение', [RE_MULTI]]
		]],

		['reg', 'form > h2', [
			['Enviar nova imagem de', 'Выбрать изображение для', [RE_MULTI, RE_NOBREAK]],
			['spoiler', 'спойлер'],
			['arquivo deletado', 'файл удален'],
			['arquivo deletado', 'нет файла']
		]],
		['reg', 'body > div > form > p', [/Imagem de .+ atual/, 'Текущее изображение', [RE_INNER, RE_MULTI]]],
		['att', 'input[type="submit"]', 'value', 'Сохранить изображения'],

		[]
	]],

	// Админка - Настройки доски - Модераторы
	[/^mod\.php\?\/volunteers\//, [
		['reg', 'head > title', ['Editar voluntários', 'Редактирование модераторов']],
		['reg', 'header > h1', ['Editar voluntários', 'Редактирование модераторов']],
		['reg', 'form > h2', ['Novo usuário', 'Новый модератор']],
		['reg', 'body > div > h2', ['Voluntários atuais', 'Текущие модераторы']],
		['reg', 'form > p > span.unimportant', [/Limite de (\d+) voluntários.+/, 'Лимит пользователей: $1. Убедитесь, что используете надежные пароли. Модератор может делать то же, что и админ, за исключением просмотра этой страницы, страницы банеров и страницы настройки доски.']],
		
		['reg', 'input[type="submit"]', [
			['Criar usuário', 'Добавить'],
			['Deletar selecionados', 'Удалить выделенных']
		], [RE_OUTER]],

		[]
	]],

	// Админка - Редактирование учетной записи
	[/^mod\.php\?\/users\//, [
		['reg', 'head > title', ['Edit user profile', 'Учетная запись']],
		['reg', 'header > h1', ['Edit user profile', 'Изменение учетной записи']],
		['reg', 'table > tbody > tr > th', [
			[/Usuário(.+)\(alerta:.+/, 'Логин$1(внимание: после изменения имени нужно войти заново,<br>имя в журнале событий также будет заменено на новое)'],
			[/Senha(.+)\(novo.+/, 'Пароль$1(новый; не обязательно)'],
			[/se você esquecer.+para (.+@brchan\.org).+/, 'если вы забыли свой пароль, напишите на $1<br> и попросите его сбросить. Адрес почты должен быть<br>тот же, связанный с учетной записью; по желанию)']
		], [RE_INNER]],
		['reg', 'input[type="submit"]', ['Salvar alterações', 'Сохранить изменения'], [RE_OUTER]]
	]],

	// Админка - Бан
	[/^mod\.php\?\/\w+\/ban(&delete)?\//, [
		['reg', 'head > title', ['Novo ban', 'Новый бан']],
		['reg', 'header > h1', ['Novo ban', 'Новый бан']],
		['reg', 'table > tbody > tr > th > label', [
			[/(IP.+)\(ou subnet\)/, '$1(или подсеть)', [RE_INNER]],
			['Motivo', 'Причина'],
			['Mensagem', 'Сообщение'],
			['Tamanho', 'Длительность']			
		]],
		['reg', 'table > tbody > tr:nth-child(5) > th', ['Board', 'Доска']],
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
		['reg', 'head > title', ['Lista de bans', 'Список банов']],
		['reg', 'header > h1', ['Lista de bans', 'Список банов']],
		['txt', 'div.banlist-opts > div.checkboxes > label', TYPE_LASTNODE, 'Показать только активные баны'], // txt, т.к. на input висит обработчик
		['att', 'input#search', 'placeholder', 'Искать...'],
		['att', 'input#unban', 'value', 'Разбанить выделенных'],
		[]
	]],


	// Админка - PM: создание/ответ
	[/^mod\.php\?\/(new_PM\/|PM\/\d+\/reply)/, [
		['reg', 'head > title', [/Nova MP para (.+)/, 'Cообщение для $1']],
		['reg', 'header > h1', [/Nova MP para (.+)/, 'Личное сообщение для $1']],
		['reg', 'table > tbody > tr > th', [
			['To', 'Кому'],
			['Message', 'Сообщение']
		]],
		['reg', 'input[type="submit"]', ['Enviar mensagem', 'Отправить'], [RE_OUTER]]
	]],

	// Админка - PM: просмотр
	[/^mod\.php\?\/PM\/\d+$/, [
		['reg', 'head > title', [/Mensagem privada (.+)/, 'Личное cообщение $1']],
		['reg', 'header > h1', [/Mensagem privada (.+)/, 'Личное сообщение $1']],
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
			['ago', 'назад']
		], [RE_INNER, RE_NOBREAK]],
		['att', 'input[name="delete"]', 'value', 'Удалить'],
		['reg', 'form > ul > li > a', ['Responder com citação', 'Ответить с цитированием']],
	]],

	// Админка - PM: входящие
	[/^mod\.php\?\/inbox$/, [
		['reg', 'head > title', [/Caixa de entrada \((\d+) unread\)/, 'Входящие (новых: $1)']],
		['reg', 'header > h1', [/Caixa de entrada \((\d+) unread\)/, 'Входящие (новых: $1)']],
		['reg', 'table.modlog > tbody > tr > th', [
			['De', 'От'],
			['Data', 'Дата'],
			['Message snippet', 'Первью сообщения']
		]],
	]],

	// Админка - Редактирование поста
	[/^mod\.php\?\/\w+\/edit\//, [
		['reg', 'head > title', ['Editar mensagem', 'Редактирование сообщения']],
		['reg', 'header > h1', ['Editar mensagem', 'Редактирование сообщения']],
		['reg', 'table > tbody > tr > th', [
			['Nome', 'Имя'],
			['Tripcode', 'Трипкод'],
			['Assunto', 'Тема'],
			['Mensagem', 'Сообщение'],
			['Embutir', 'Вставка'] // ???
		]],
		['reg', 'table > tbody > tr:nth-child(2) > td', ['Remove tripcode', 'Удалить трипкод', [RE_INNER]]],
		['att', 'input[name="post"]', 'value', 'Сохранить'],
		['reg', 'form > h2', ['Existing post', 'Существующий пост']],
		[]
	]],


	// Админка - История событий
	[/^mod\.php\?\/log[:]/, [
		['reg', 'head > title', ['Histórico da board', 'История событий']],
		['reg', 'header > h1', ['Histórico da board', 'История событий доски']],
		['reg', 'table.modlog > tbody > tr > th', [
			['Usuário', 'Имя'],
			['Endereço de IP', 'IP-адрес'],
			['Tempo', 'Время'],
			['Board', 'Доска'],
			['Ação', 'Действие']
		]],
		['reg', 'table.modlog > tbody > tr > td:nth-child(2)', ['hidden', 'скрыт'], [RE_INNER, RE_MULTI]], // ip
		['reg', 'table.modlog > tbody > tr > td:nth-child(3)', [ // время
			[/segundos?/, 'сек'],
			[/minutos?/, 'мин'],
			[/horas?/, 'ч'],
			[/dias?/, 'дн']
		], [RE_INNER, RE_MULTI]],
		['reg', 'table.modlog > tbody > tr > td:nth-child(5)', [ // действия. хз надо ???
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
			[/^Created a new (.+) ban on (\/\w+\/) for (.+\(#\d+\)) with (no |)reason:?/, "Бан '$1' на доске $2 для $3. Причина: $4"],
			[/^Created a new volunteer/, 'Добавлен новый модератор'],
			[]
		], [RE_MULTI]]
	]],

	// Админка - Последние сообщения
	[/^mod\.php\?\/recent/, [
		['reg', 'head > title', ['Mensagens recentes', 'Последние сообщения']],
		['reg', 'header > h1', ['Mensagens recentes', 'Последние сообщения']],
		['reg', 'body > h4', [/Viewing last (\d+) posts/, 'Отображаются последние $1 постов']],
		['reg', 'body > p', [/^View/, 'Показывать:'], [RE_INNER]],
		['css', 'body > a#erase-local-data', 'Стереть локальные данные'], // wtf?
		['reg', 'body > a[href^="/mod.php?/recent/"]', [/Next (\d+) posts/, 'Следующие $1 постов']],
		['reg', 'body > p.unimportant', [/\(Não há posts ativos.+/, '(Больше новых сообщений нет)<br><a href="/mod.php?/recent/25">Вернуться</a>'], [RE_INNER]],
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

		// причина
		['reg', 'fieldset#bans table tr:nth-child(3) > td', [/^sem razão especificada/, '-- не указано --'], [RE_MULTI]],

		// виза (Equipe)
		['reg', 'fieldset#bans table tr:nth-child(7) > td', [
			['Não', 'Нет']
		], [RE_MULTI]],

		['att', 'input[name="unban"]', 'value', 'Разбанить'],

		[]
	]],

	[]
];

// ==============================================================================================
// окно алертов
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
// перевод новых постов
// ==============================================================================================
replacer.cfg["new_post"] = [
	['', [
		['css', 'span.name', 'Аноним'],
		['txt', 'p.fileinfo', TYPE_FIRSTNODE, 'Файл: ']
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
	"Hide locked threads": "Скрывать закрытые треды",
	"URL": "URL",
	"Select": "Select",
	"Remote": "Remote",
	"Embed": "Embed",
	"Oekaki": "Oekaki",
	"hidden": "hidden",
	"Show images": "Показать изображения",
	"Hide images": "Скрыть изображения",
	"Password": "Пароль",
	"Delete file only": "Удалить только файл",
	"Delete": "Удалить",
	"Reason": "Причина",
	"Report": "Жалоба",
	"Global report": "Жалоба администраторам",
	"Click reply to view.": "Нажмите ответ для просмотра",
	"Click to expand": "Нажмите для раскрытия",
	"Hide expanded replies": "Скрыть раскрытые ответы",
	"Brush size": "Размер кисти",
	"Set text": "Set text",
	"Clear": "Очистить",
	"Save": "Сохранить",
	"Load": "Загрузить",
	"Toggle eraser": "Toggle eraser",
	"Get color": "Get color",
	"Fill": "Заливка",
	"Use oekaki instead of file?": "Use oekaki instead of file?",
	"Edit in oekaki": "Edit in oekaki",
	"Enter some text": "Enter some text",
	"Enter font or leave empty": "Enter font or leave empty",
	"Forced anonymity": "Анонимное имя вместо пользовательских",
	"enabled": "enabled",
	"disabled": "disabled",
	"Sun": "Вс",
	"Mon": "Пн",
	"Tue": "Вт",
	"Wed": "Ср",
	"Thu": "Чт",
	"Fri": "Пт",
	"Sat": "Сб",
	"Catalog": "Каталог тредов",
	"Submit": "Отправить",
	"Quick Reply": "Быстрый ответ",
	"Posting mode: Replying to <small>&gt;&gt;{0}<\/small>": "Posting mode: Replying to <small>&gt;&gt;{0}<\/small>",
	"Return": "Вернуться",
	"Expand all images": "Развернуть все изображения",
	"Shrink all images": "Свернуть все изображения",
	"Hello!": "Привет!",
	"{0} users": "{0} пользователей",
	"(hide threads from this board)": "(скрыть этот тред на этой доске)",
	"(show threads from this board)": "(показать этот тред на этой доске)",
	"No more threads to display": "No more threads to display",
	"Loading...": "Загрузка...",
	"Save as original filename": "Сохранить с оригинальным именем",
	"Reported post(s).": "Жалоба отправлена.",
	"An unknown error occured!": "An unknown error occured!",
	"Something went wrong... An unknown error occured!": "Something went wrong... An unknown error occured!",
	"Working...": "Working...",
	"Posting... (#%)": "Отправка... (#%)",
	"Posted...": "Отправлено...",
	"An unknown error occured when posting!": "An unknown error occured when posting!",
	"Posting...": "Отправка...",
	"Upload URL": "Upload URL",
	"Spoiler Image": "Spoiler Image",
	"Comment": "Комментарий",
	"Watch Thread": "В избранное",
	"Stop watching this thread": "Удалить из избранного",
	"Watch this thread": "В избранное",
	"Unpin this board": "Unpin this board",
	"Pin this board": "Pin this board",
	"Stop watching this board": "Stop watching this board",
	"Watch this board": "Watch this board",
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
	"WebM Settings": "WebM Настройки",
	"Expand videos inline": "Разворачивать видео в посте",
	"Play videos on hover": "Воспроизводить видео при наведении",
	"Default volume": "Громкость по умолчанию",
	"Tree view": "Tree view",
	"Animate GIFs": "Animate GIFs",
	"Unanimate GIFs": "Unanimate GIFs",
	"WebM": "WebM",
	"No new posts.": "No new posts.",
	"No new threads.": "No new threads.",
	"There are {0} new threads.": "There are {0} new threads.",
	"There are {0} new posts in this thread.": "There are {0} new posts in this thread.",
	"Options": "Настройки",
	"General": "Главная",
	"Storage: ": "Хранилище: ",
	"Export": "Экспорт",
	"Import": "Импорт",
	"Paste your storage data": "Paste your storage data",
	"Erase": "Удалить",
	"Are you sure you want to erase your storage? This involves your hidden threads, watched threads, post password and many more.": "Are you sure you want to erase your storage? This involves your hidden threads, watched threads, post password and many more.",
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
	"(You)": "(Вы)",
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
	"Add filter": "Добавить фильтр",
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

	// дополнительные (не заданные в бразильской локализации). Имена искать в main.js
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
	"Clear Ghosts": "Удалить несуществующие",
	"Reply": "Ответить",

	"":""
};

// ==============================================================================================
// replacer functions
// ==============================================================================================

// ----------------------------------------------------
replacer.process = function(cfg, element, debug)
// ----------------------------------------------------
{
	/* 
	произвести замену с использованием конфига с именем cfg
		element - родительский элемент, по умолчанию document
		debug - включить отладку конфига (true/false)
	*/
	
	if(!this.cfg[cfg]) {
		if(this.debug) console.debug("ERROR: CFG NOT FOUND: ", cfg);
		return;
	}

	let perf = performance.now();
	if(!element) element = document;

	// в this.instance[] хранится кол-во запусков для каждого конфига (нужно для regex в частности)
	if(!this.instance) this.instance = [];
	if(!this.instance[cfg]) this.instance[cfg] = 0;
	this.instance[cfg]++; 
	this.instanceLocal = this.instance[cfg]; // кол-во запусков текущего конфига

	if(this.debug) console.group("["+cfg+"]: ", element);
	for(let u of this.cfg[cfg])
	{
		// перебор всех групп url-regex в заданном конфиге
		if(!u.length) continue; // empty
		if(u.length < 2 || !Array.isArray(u[1])) // проверка параметров
		{
			if(this.debug) console.debug("ERROR: Syntax1:", u);
			continue;
		}
		if(!main.url.match(u[0])) continue; // проверка url

		if(this.debug) console.debug("URL-Match:", u[0]);

		this.debugLocal = (this.debug && (u[2] || debug)); // отладка для текущего url-regex

		// перебор реплейсеров группы
		for(let r of u[1]) 
		{
			if(!r.length) continue; //empty
			if(r.length < 2)
			{
				if(this.debug) console.debug("ERROR: Syntax2:", r);
				continue;
			}
			let fn=r[0]+"Replacer";
			if(!this[fn]) // проверка наличия функции реплейсера
			{
				if(this.debug) console.debug('ERROR: NO Replacer function for:', r);
				continue;
			}

			// вызов функции реплейсера
			let err = this[fn](element, r);

			if(err < 0)
			{
				if(this.debug) console.debug("ERROR: Syntax3"+err+":", r);
				continue;
			}
			else if(err)
				break; // прерывание цикла перебора реплейсеров для текущего url-regex
		}
	}
	if(this.debug) {
		console.debug('Relaced in', performance.now() - perf, "ms");
		console.groupEnd();
	}	
}

// ----------------------------------------------------
replacer.clear = function(cfg)
// ----------------------------------------------------
{
	// очистка заданного конфига
	if(!this.cfg[cfg]) return;
	this.cfg[cfg] = [];
	this.instance[cfg]  = 0;
}

// ----------------------------------------------------
replacer.reOpt = function(arr, def)
// ----------------------------------------------------
{
	// arr - массив модификаторов [RE_TEXT, RE_MULTI] и т.п. порядок значения не имеет
	// def - объект опций по умолчанию {prop, single, break} 
	// возвращает новый созданный объект опций {prop, single, break}

	var opt = new Object();
	if(typeof(def) != 'object')
		opt={prop: RE_TEXT, single: true, break: true};
	else
		opt={prop: def.prop, single: def.single, break: def.break};
	if(!Array.isArray(arr))
		return opt;

	for(let o of arr) {
		switch(o) {
			case RE_SINGLE: opt.single = true; break;
			case RE_MULTI: opt.single = false; break;
			case RE_BREAK: opt.break = true; break;
			case RE_NOBREAK: opt.break = false; break;
			case RE_TEXT:
			case RE_INNER:
			case RE_OUTER:
			 	opt.prop = o;
			 	break;
		}
	}
	return opt;
}

/*
// ----------------------------------------------------
 ФУНКЦИИ РЕПЛЕЙСЕРОВ 
 для каждого типа реплейсера должна быть определена функция вида:
 
 replacer.<type>Repacler = function(el, params) {...}

 где 
 	<type> - тип реплейсера (css, txt, reg и т.п.)
 	el - родительский элемент, в котором нужно производить поиск
 	params - массив параметров (из конфига) ["type", "css-selector", ....]  // type - тип реплейсера, дальше - параметры

возвращаемые значения:
	= 0 : нормальное завершение
	< 0 : ошибка во входных параметрах (в консоль выдаст сообщения со строкой конфига)
	> 0 : прервать перебор реплейсеров для текущего url-regex
*/ 

// ----------------------------------------------------
replacer.cssReplacer = function(el, p)
// ----------------------------------------------------
{
	// реплейсер текста по селектору
	// p=["css", query, text]
	if(p.length < 3)
		return -1;

	for(let e of el.querySelectorAll(p[1])) 
		e.textContent = p[2];
}


// ----------------------------------------------------
replacer.attReplacer = function(el, p)
// ----------------------------------------------------
{
	// реплейсер атрибутов
	// p=["att", query, attr_name, text]
	if(p.length < 4)
		return -1;

	for(let e of el.querySelectorAll(p[1]))
		e.setAttribute(p[2], p[3]);
}

// ----------------------------------------------------
replacer.txtReplacer = function(el, p)
// ----------------------------------------------------
{
	// реплейсер текста дочерних узлов
	// p=["txt", query, node_type, text]
	if(p.length < 4)
		return -1;

	let dbg1st = 0;
	try {
		for(let e of el.querySelectorAll(p[1])) {
			if(this.debugLocal && !dbg1st++) console.group("TXT:", p[1]);
			let node;
			switch(p[2]) {
				case TYPE_FIRSTNODE: node = e.firstChild; break;
				case TYPE_LASTNODE: node = e.lastChild; break;
			}
			if(node)
				node.textContent = p[3];
			if(this.debugLocal) {
				if(node)
					console.debug(e, ":REPLACED:", [p[3]]);
				else
					console.debug(e, ":NO NODE");
			}
		}
	} catch(err) {
		if(this.debug) console.debug("ERROR: Selector", p);
	}
	if(dbg1st) console.groupEnd();
}

// ----------------------------------------------------
replacer.regReplacer = function(el, p)
// ----------------------------------------------------
{
	/* 
	реплейсер текста по regex 
		p=["reg", query, param_arr, re_arr]
		p=["reg", query, [param_arr1,...,param_arrN], re_arr_def]

		param_arr - массив параметров: [regex, text, re_arr]
		re_arr - массив с комбинацией RE_* параметров [не обязательно]
		re_arr_def - массив с комбинацией RE_* параметров по умолчанию для всей группы [не обязательно]

		порядок и количество RE_* параметров в массиве не важен, по умолчанию: [RE_TEXT, RE_SINGLE, RE_BREAK]
	*/

	if(p.length < 3 || !Array.isArray(p[2]) || (p.length > 3 && !Array.isArray(p[3])) || p.length > 4)
		return -1;

	if(!Array.isArray(p[2][0])) 
		p[2] = [p[2]];

	// параметры по умолчанию для всей группы
	let def_opt = replacer.reOpt(p[3]);
	let dbg1st = 0;

	try {
	for(let e of el.querySelectorAll(p[1]))
	{
		if(this.debugLocal) {
			if(!dbg1st++) console.group("REG:", p[1]);
			console.debug(" \nELM:", e);
		}
		let re_cnt = 0; // кол-во активных regex (не сработавших)
		let dobreak = false;
		let dbgMsg = "";
		for(let a of p[2]) 
		{
			if(!a.length)
				continue;
			if(a.length < 2) // проверка параметров
			{
				if(dbg1st) console.groupEnd();
				return -2;
			}

			if(!a[3] || a[3] < this.instanceLocal) // проверка на активный regex
				re_cnt++;
			if(dobreak || a[3] == this.instanceLocal)
				continue; // продолжаем подсчет активных regex

			let opt = replacer.reOpt(a[2], def_opt);

			if(e[opt.prop].match(a[0]))
			{
				e[opt.prop] = e[opt.prop].replace(a[0], a[1]);
				dbgMsg = ": FOUND";

				if(opt.single)
				{
					a[3] = this.instanceLocal; // выставляем флаг сработавшего regex
					re_cnt--;
					dbgMsg += ": REMOVED";
				}
				if(opt.break)
				{
					dobreak = true; // прерываем цикл перебора regex
					dbgMsg += ": BREAK";
				}
			}
			else 
				dbgMsg = ": NOT FOUND";

			if(this.debugLocal) console.debug("FND:",  [a[0], a[1]], dbgMsg);
		} // for a
		if(re_cnt < 1)
		{
			// прекращаем перебор элементов, т.к. не осталось активных regex
			if(this.debugLocal) console.debug("STOP");
			break;
		}
	} // for e
	if(dbg1st) console.groupEnd();	
	} catch(err) {
		if(this.debug) console.debug("ERROR: Selector:", p);
	}
}

// ----------------------------------------------------
replacer.strReplacer = function(el, p)
// ----------------------------------------------------
{
	// реплейсер текста в переданном объекте el {text}
	// p=["str", regex, text]

	if(p.length<3)
		return -1;

	if(el.text.match(p[1])) {
		el.text = el.text.replace(p[1], p[2]);
		//if(this.debugLocal) console.debug("STR:", p, ": FOUND\nSTOP");
		return 1;
	}
	//if(this.debugLocal) console.debug("FND:", p, ": NOT FOUND");
}

// ==============================================================================================
// MAIN
// ==============================================================================================

var main = {
	fn: {}, // для хранения внешних функций
	ru: {
		days: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб','Вс']
	},
	url: document.URL.replace(/https?:\/\/[^/]+\/(.*)/, "$1"), // текущий URL страницы (без протокола и домена)

	// ----------------------------------------------------
	onDocReady: function() 
	// ----------------------------------------------------
	{
		// перевод всплывающих сообщений
		main.fn.alert = window.alert;
		window.alert = function(msg, do_confirm, confirm_ok_action, confirm_cancel_action)
		{
			msg = {text: msg};
			replacer.process("alert", msg, false);

			//console.debug(msg.text, do_confirm, confirm_ok_action, confirm_cancel_action);
			main.fn.alert(msg.text, do_confirm, confirm_ok_action, confirm_cancel_action);
		};

		// очистка поля капчи при обновлении
		main.fn.actually_load_captcha = window.actually_load_captcha;
		window.actually_load_captcha = function(provider, extra)
		{
			main.fn.actually_load_captcha(provider, extra);
			for(let el of document.querySelectorAll('form input[name="captcha_text"]'))
				el.value = "";
		};

		if(window.jQuery) 
		{
			// перевод новых постов
			$(document).on('new_post', function(e, post) {
				replacer.process("new_post", post, false);
				main.fixPostDate(post);
				main.fixRedirect(post);
				// TODO: кнопки модерирования на новых постах
			});
			$('#watchlist').css('width', '20%');
		}

		main.fixThread();
		main.fixCatalog();

		// перевод страниц
		//replacer.process("main");
		replacer.process("main", document, false);
		replacer.clear("main");
	},

	// ----------------------------------------------------
	timeLocaleString: function(time)
	// ----------------------------------------------------
	{
		// форматирование даты (time - объект Date)
		return (time.toLocaleDateString() + " (" + main.ru.days[time.getDay()] + ") " + time.toLocaleTimeString());
	},
	
	// ----------------------------------------------------
	fixPostDate: function(element) 
	// ----------------------------------------------------
	{
		// дата и время постов (перевод + коррекция)
		for(let el of (element ? element : document).querySelectorAll("p.intro time"))
		{
			var t = new Date(el.getAttribute("datetime"));
			t.setTime(t.getTime() + TIME_CORR);
			el.innerText = main.timeLocaleString(t);
		}
	},

	// ----------------------------------------------------
	fixRedirect: function(element)
	// ----------------------------------------------------
	{
		// удаление редиректа для внешних ссылок
		let url="http://privatelink.de/?";
		for(let el of (element ? element : document).querySelectorAll('a[href^="'+url+'"]'))
			el.setAttribute("href", el.getAttribute("href").substr(url.length));
	},

	// ----------------------------------------------------
	fixThread: function()
	// ----------------------------------------------------
	{
		// фиксы для любой доски/треда
		if(!main.url.match(/^(mod\.php\?\/|)\w+(\/?$|\/.+\.html)/))
			return;

		main.fixPostDate(); // добавить дату постов в тредах
		main.fixRedirect(); // удаление редиректов 

		// Перемещает изображения в ОП посте в сам пост
		for(let thread of document.querySelectorAll('div.thread')) {
			let files = thread.getElementsByClassName('files')[0];
			if(typeof files == 'undefined' || !files.hasChildNodes()) {
				continue;
			}

			let body = thread.getElementsByClassName('body')[0];

			if(files.childNodes.length > 3) {
				files.style.display = 'inline-block';
			}
			else {
				body.style.overflow = 'auto';
			}

			for(i of files.getElementsByClassName('post-image')) {
				i.style.margin = '0';
			}

			body.parentNode.insertBefore(files, body);
		}
	},

	// ----------------------------------------------------
	fixCatalog: function()
	// ----------------------------------------------------
	{
		// фиксы для каталога тредов
		if(!main.url.match(/^\w+\/catalog\.html/))
			return;

		var t;
		for(let el of document.querySelectorAll("div.mix")) 
		{
			if(!(t = el.getAttribute("data-time"))) // дата создания
				continue;
			t = new Date(t*1000 - 3600000);
			if(!(el = el.querySelector("strong"))) 
				continue;
			el.innerHTML = el.innerHTML + "<br><small>"+ main.timeLocaleString(t); + "</small>";
		}
	},

	// ----------------------------------------------------
	init: function()
	// ----------------------------------------------------
	{
		console.log("Brchan Russifikator started");
		console.debug("URL:", main.url);

		// замена бразильской локализации
		Object.defineProperty(window, "l10n", {
			get: function() {
				return l10n_rus;
			},
			set: function(value){}
		});

		if (document.addEventListener) {
			document.addEventListener("DOMContentLoaded", main.onDocReady, false);
		} else if (document.attachEvent) {
			document.attachEvent("onreadystatechange", main.onDocReady);
		}
	}
} // main

main.init();
