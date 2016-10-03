// ==UserScript==
// @name            Brchan Rusifikator
// @version         3.2
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

const TYPE_FIRSTNODE = 0;
const TYPE_LASTNODE = 1;

/* cfg = [
	[ /url-regexp/, [
		["replacer_type", "selector", "search-text", "replace-text", true],
		[.....]
	]],

	[.....]
]

	url-regexp: regexp for url match (search in path, not domain), root url is: /

	replacer_type:
		css
		txt - inner text
		reg - regexp
		att - attribute

	selector: css selector

	search-text:
		for css: is replace-text
		for txt: type of node (TYPE_FIRSTNODE or TYPE_LASTNODE without quotes!)
		for reg: regexp for search
		for att: name of tag's attribute

	replace-text:
		for css: - (not needed)
		for txt,reg,att: text for replace

	true
		required for regex replace, true = replace as html
*/

cfg = [

	// Общие переводы (для всех url)
	[/^/, [
		// Панель меню
		['txt', 'div.boardlist > span > a[href="/"]', TYPE_LASTNODE, ' Главная'],
		['txt', 'div.boardlist > span > a[href="/boards.html"]', TYPE_LASTNODE, ' Список досок'],
		['txt', 'div.boardlist > span > a[href="/random.php"]', TYPE_LASTNODE, ' На случайную доску'],
		['txt', 'div.boardlist > span > a[href="/create.php"]', TYPE_LASTNODE, ' Создать доску'],
		['txt', 'div.boardlist > span > a[href="/mod.php"]', TYPE_LASTNODE, ' Админка'],
		['txt', 'div.boardlist > span > a[href="/bugs.php"]', TYPE_LASTNODE, ' Сообщить об ошибке'],
		['css', 'body > div > a[title="Opções"]', '[Настройки]'],

		// Диалог настроек
		['att', 'div.options_tab > input[value="Salvar Javascript personalizado"]', 'value', 'Сохранить'],
		['att', 'div.options_tab > input[value="Salvar CSS personalizado"]', 'value', 'Сохранить'],

		['reg', 'div#options_tablist > div.options_tab_icon > div', 'Geral', 'Главная'],
		['txt', 'div > label#show_top_boards', TYPE_LASTNODE, 'Показывать ТОП досок'],
		['txt', 'div > span#inline-expand-max', TYPE_FIRSTNODE, 'Количество одновременных загрузок (0 для отключения)'],
		['txt', 'fieldset#auto-update-fs > legend', TYPE_LASTNODE, 'автоматическое обновление'],
		['txt', 'fieldset#auto-update-fs > label#auto-thread-update', TYPE_LASTNODE, 'Автообновление тредов'],
		['txt', 'fieldset#auto-update-fs > label#auto_thread_desktop_notifications', TYPE_LASTNODE, 'Показывать уведомления на рабочем столе при ответе мне'],
		['txt', 'fieldset#auto-update-fs > label#auto_thread_desktop_notifications_all', TYPE_LASTNODE, 'Показывать уведомления на рабочем столе для всех ответов'],

		['reg', 'div#options_tablist > div.options_tab_icon > div', 'Tema', 'Темы & CSS'],
		['reg', 'div#options_tablist > div.options_tab_icon > div', 'JS de usuário', 'JavaScript'],

		[]
	]],

	// Любая доска + тред (url вида: /слово/* )
	[/^\w+\/[^/]*/, [
		['css', 'div.subtitle > p > a', 'Каталог тредов'],
		['css', 'div#expand-all-images > a', 'Развернуть все изображения'],

		['reg', 'time', '(Seg)', '(Пнд)'],
		['reg', 'time', '(Ter)', '(Втр)'],
		['reg', 'time', '(Qua)', '(Срд)'],
		['reg', 'time', '(Qui)', '(Чтв)'],
		['reg', 'time', '(Sex)', '(Птн)'],
		['reg', 'time', '(Sáb)', '(Сбт)'],
		['reg', 'time', '(Dom)', '(Вск)'],

		// Посты
		['css', 'span.name', 'Аноним'],
		['txt', 'p.fileinfo', TYPE_FIRSTNODE, 'Файл: '],
		['css', 'a.watchThread', '[В избранное]'],
		['css', 'a#link-quick-reply', '[Ответить]'],

		// Форма ответа
		['reg', 'table.post-table > tbody > tr > th', 'Opções', 'Опции'],
		['reg', 'table.post-table > tbody > tr > th', 'Assunto', 'Тема/Имя'],
		['reg', 'table.post-table > tbody > tr > th', 'Mensagem', 'Сообщение'],
		['reg', 'table.post-table > tbody > tr > th', 'Arquivo', 'Файл'],
		['css', 'div.file-hint', 'кликни / брось файл сюда'],
		['css', 'span.required-wrap > span.unimportant', '= обязательные поля'],
		['css', 'a.show-post-table-options', '[Показать опции]'],
		['att', 'input[name="post"]', 'value', 'Отправить'],
		['css', 'tr#oekaki > th', 'Рисовать'],
		['css', 'tr#upload_embed > th', 'Ссылка на YouTube'],
		['css', 'tr#options-row > th', 'Опции'],

		['reg', 'tr#oekaki > td > a', 'Mostrar oekaki', 'Начать'],
		['reg', 'tr#oekaki > td > span.unimportant', 'substitui arquivos', 'заменяет файл'],
		['reg', 'tr#upload_embed > td > span.unimportant', 'substitui arquivos', 'заменяет файл'],
		['reg', 'tr#options-row > td > div.no-bump-option > label', 'Não bumpar', 'Не поднимать тред', true],
		['reg', 'tr#options-row > td > div.spoiler-images-option > label', 'Imagem spoiler', 'Скрыть превью изображения', true],

		[]
	]],

	// Главная страница доски (url вида: /слово/* )
	[/^\w+\/[^/]*$/, [
		// Навигация по страницам
		['reg', 'body > div.pages', /Anterior/, 'Предыдущая', true],
		['reg', 'body > div.pages', /Próxima/, 'Следующая', true],
		['reg', 'body > div.pages', /Catálogo/, 'Каталог', true],

		['reg', 'p.intro > a', 'Responder', 'Ответить'],
		['reg', 'p.intro > a', /Últimas (\d+) Mensagens/, 'Последние $1 сообщений'],

		['reg', 'span.toolong', /Mensagem muito longa. Clique <a href="(.*)">aqui<\/a> para ver o texto completo\./, 'Сообщение слишком длинное. Нажмите <a href="$1">здесь</a> чтобы увидеть полный текст.', true],
		['reg', 'div.post > span.omitted', /(\d+) mensagens e (\d+) resposta. com imagem omitida.(.*)/, function(original, str1, str2){return ' Пропущен' +get_correct_str(str1, '', 'о', 'о')+ ' ' +str1+ ' ответ' +get_correct_str(str1, '', 'а', 'ов') + ' из них ' +str2+ ' ответ' +get_correct_str(str2, '', 'а', 'ов')+ ' с изображениями. Нажмите ответить, чтобы посмотреть.';}, true],
		['reg', 'div.post > span.omitted', /(\d+) mensagens omitidas?(.*)/, function(original, str1){return ' Пропущен' +get_correct_str(str1, '', 'о', 'о')+ ' ' +str1+ ' ответ' +get_correct_str(str1, '', 'а', 'ов')+ '. Нажмите ответить, чтобы посмотреть.';}, true],

		[]
	]],

	// Страница треда
	[/^\w+\/res\/(\d+)\.html/, [
		['css',	'a#thread-return',	'[Назад]'],
		['css',	'a#thread-top',		'[Вверх]'],
		['css',	'a#thread-catalog',	'[Каталог]'],
		['css',	'a#update_thread',	'[Обновить]'],

		[]
	]],

	// Страница каталога доски
	[/^\w+\/catalog\.html$/, [
		['txt', 'header > h1', TYPE_FIRSTNODE, 'Каталог тредов ('],
		['reg', 'span', 'Ordenar por: ', 'Сортировка по: ', true],
		['css', 'select#sort_by > option[value="bump:desc"]', 'Активности'],

		[]
	]],

	// Список досок
	[/^boards\.html/, [
		// Статистика
		['css', 'main > section > h2', 'Статистика'],
		['reg', 'main > section > p', /Há atualmente (.+) boards públicas, (.+) no total. Na última hora foram feitas (.+) postagens, sendo que (.+) postagens foram feitas em todas as boards desde/, 'В настоящее время доступно $1 публичных досок из $2. За последнюю минуту написано $3 постов. Высего было написано $4 постов начиная с', true],
		['reg', 'main > section > p', 'Última atualização desta página', 'Последнее обновление страницы'],

		// Панель поиска
		['css', 'aside > form > h2', 'Поиск'],
		['reg', 'aside > form label.search-item.search-sfw', 'Ocultar', 'Скрыть', true],
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

		['reg', 'table.modlog > tbody > tr > th', 'URI', 'URL'],
		['reg', 'table.modlog > tbody > tr > th', 'Título', 'Название'],
		['reg', 'table.modlog > tbody > tr > th', 'Subtítulo', 'Описание'],
		['reg', 'table.modlog > tbody > tr > th', 'Usuário', 'Логин'],
		['reg', 'table.modlog > tbody > tr > th', 'Senha', 'Пароль'],

		['reg', 'table.modlog > tbody > tr > td > span', /letras, números e no máximo (\d+) caracteres/, 'буквы, цифры и не более $1 символов'],
		['reg', 'table.modlog > tbody > tr > td > span', /até (\d+) caracteres/, 'до $1 символов'],
		['reg', 'table.modlog > tbody > tr > td > span', 'letras, numeros, pontos e sublinhados', 'буквы, цифры, точки и подчеркивание'],
		['reg', 'table.modlog > tbody > tr > td > span', 'senha para moderar a board, copie-a', 'пароль для модерирования, сохраните его'],
		['reg', 'table.modlog > tbody > tr > td > span', 'opcional,serve para recuperar sua board', 'по желанию, служит для восстановления доски'],

		['att', 'input[type="submit"]', 'value', 'Создать доску'],

		// Ошибки создания / сообщения
		['reg', 'body > div > h2', 'URI inválida', 'Неверный URL'],
		['reg', 'body > div > h2', 'Usuário inválido', 'Недействительный пользователь'],
		['reg', 'body > div > h2', 'A board já existe', 'Доска уже существует'],
		['reg', 'body > div > h2', 'Você errou o codigo de verificação', 'Неверный код подтверждения'],

		['reg', 'body > div > p > a', 'Voltar', 'Назад'],

		['reg', 'body > p', 'Sua board foi criada e está disponível em', 'Ваша доска была создана и доступна по адресу', true],
		['reg', 'body > p', 'Certifique-se de não esquecer a senha de sua board', 'Убедитесь в том, чтобы не забыть пароль к доске', true],
		['reg', 'body > p', 'Você pode gerenciar sua board nessa página', 'Вы можете управлять вашей доской на этой странице', true],

		[]
	]],

	// Админка - Главная
	[/^mod\.php\?\/$/, [
		['css', 'header > h1', 'Панель администрирования'],

		['reg', 'fieldset > legend', 'Mensagens', 'Сообщения'],
		['reg', 'fieldset > ul > li', 'Quadro de noticias', 'Доска объявлений', true],
		['reg', 'fieldset > ul > li > ul > li > a', 'Comunicado', 'Коммуникация'],
		['reg', 'fieldset > ul > li > a', 'Ver todas as noticias do quadro de noticias', 'Просмотр всех новостей'],
		['reg', 'fieldset > ul > li > a', /Caixa de entrada \((\d+) unread\)/, 'Входящие (непрочитанных: $1)'],

		['reg', 'fieldset > legend', 'Administração', 'Администрирование'],
		['reg', 'fieldset > ul > li > a', /Fila de denuncias \((\d+)\)/, 'Очередь отчетов ($1)'],
		['reg', 'fieldset > ul > li > a', 'Lista de bans', 'Список банов'],
		['reg', 'fieldset > ul > li > a', 'Apelos a banimento', 'Аппеляции банов'],
		['reg', 'fieldset > ul > li > a', 'Editar conta', 'Изменить учетную запись'],
		['reg', 'fieldset > ul > li > span', 'nome de usuário, email, senha', 'имя пользователя, адрес электронной почты, пароль'],
		['reg', 'fieldset > ul > li > a', 'Histórico da board', 'История доски'],
		['reg', 'fieldset > ul > li > a', 'Mensagens recentes', 'Последние сообщения'],

		['reg', 'fieldset > legend', 'Boards', 'Доски'],
		['reg', 'fieldset > ul > li > a', 'configurações', 'настройки'],

		['reg', 'fieldset > legend', 'Conta de usuário', 'Учетная запись'],
		['reg', 'fieldset > ul > li > a', 'Logout', 'Выход'],

		[]
	]],

	// Админка - Настройка доски
	[/^mod\.php\?\/settings\//, [
		['css', 'head > title', 'Настройки доски'],
		['css', 'header > h1', 'Настройки доски'],
		['css', 'body > p', 'Внимание: Некоторые изменения не вступят в силу до тех пор, пока не будет написан новый пост на доске.'],

		['reg', 'table > tbody > tr > th', 'URI', 'URL'],
		['reg', 'table > tbody > tr > td', 'não pode ser alterado', 'не может быть изменен'],

		[]
	]],

	[]
];


class CSSReplace {
	constructor(query, text) {
		this.query = query;
		this.text = text;
	}
	replace(element) {
		for(let el of (element ? element : document).querySelectorAll(this.query)) {
			el.textContent = this.text;
		}
	}
}

class AttributeReplace {
	constructor(query, attr, text) {
		this.query = query;
		this.attr = attr;
		this.text = text;
	}
	replace(element) {
		for(let el of (element ? element : document).querySelectorAll(this.query)) {
			el.setAttribute(this.attr, this.text);
		}
	}
}

class InnerTextReplace {
	constructor(query, type, text) {
		this.query = query;
		this.type = type;
		this.text = text;
	}
	replace(element) {
		for(let el of (element ? element : document).querySelectorAll(this.query)) {
			let node;
			switch(this.type) {
			case 0: node = el.firstChild; break;
			case 1: node = el.lastChild; break;
			}
			if(node) {
				node.textContent = this.text;
			}
		}
	}
}

class RegexReplace {
	constructor(query, regex, text, html) {
		this.query = query;
		this.regex = regex;
		this.text = text;
		this.prop = html ? "innerHTML" : "textContent";
	}
	replace(element) {
		for(let el of (element ? element : document).querySelectorAll(this.query)) {
			if(el[this.prop].match(this.regex)) { // проверка, чтобы не ломать html если исходный текст не найден
				el[this.prop] = el[this.prop].replace(this.regex, this.text);
			}
		}
	}
}

var get_correct_str = function(num, str1, str2, str3) {
	let val = num % 100;

	if(val > 10 && val < 20) {
		return str3;
	}
	else {
		val = num % 10;
		if(val == 1) {
			return str1;
		}
		else if(val > 1 && (val < 5)) {
			return str2;
		}
	else {
			return str3;
		}
	}
};

var user_js = localStorage.getItem('user_js') || "";
if(!user_js.match('var l10n = {'))
localStorage.user_js += '\n/* l10n v1 user */\nvar l10n = { \
	"Watch Thread": "В избранное", \
	"Show post options &amp; limits": "Показать опции", \
	"Hide post options &amp; limits": "Скрыть опции", \
	"Hide locked threads": "Скрыть закреплённые треды", \
	"Hide images": "Скрыть изображения", \
	"Forced anonymity": "Анонимное имя вместо пользовательских", \
	"Posting... (#%)": "Отправка... (#%)", \
	"Posted...": "Ответил...", \
	"(You)": "(Ваш пост)", \
	"Updating...": "Обновление...", \
	"Thread updated with {0} new post(s)": "Тред обновлён, {0} новый(ых) пост(ов)", \
	"Hide IDs": "Скрыть IDs", \
	"Scroll to new posts": "Автоскролл к новым постам", \
	"YouTube size": "Размер YouTube плеера", \
	"Enable formatting keybinds": "Включить горячие клавиши форматирования текста", \
	"Show formatting toolbar": "Показывать тулбар форматирования текста", \
	"Favorites": "Избранные доски", \
	"Filters": "Фильтры", \
	"Hide post": "Скрыть", \
	"Unhide post": "Показать", \
	"Add filter": "Фильтр", \
	"Post +": "Скрыть пост и все ответы", \
	"Hide post and all replies": "Скрыть пост и ответы", \
	"Delete post": "Удалить пост", \
	"Delete file": "Удалить файл", \
	"Report": "Сообщить модераторам доски", \
	"Global report": "Сообщить админам brchan", \
	"Shrink all images": "Свернуть все изображения" \
};/* /l10n v1 user */';

let replacers = [];
let new_posts_replacers = [
	new CSSReplace('span.name', 'Аноним'),
	new InnerTextReplace('p.fileinfo', TYPE_FIRSTNODE, 'Файл: '),
	new RegexReplace('time', '(Seg)', '(Пнд)'),
	new RegexReplace('time', '(Ter)', '(Втр)'),
	new RegexReplace('time', '(Qua)', '(Срд)'),
	new RegexReplace('time', '(Qui)', '(Чтв)'),
	new RegexReplace('time', '(Sex)', '(Птн)'),
	new RegexReplace('time', '(Sáb)', '(Сбт)'),
	new RegexReplace('time', '(Dom)', '(Вск)')
];

//console.debug(cfg);

(function(){
	// parce config
	let url = document.URL.replace(/https?:\/\/[^/]+\/(.+)/i, "$1"); // extract url path
	console.debug("URL: ", url);
	let i = performance.now();
	for(let u of cfg)
	{
		if(u.length != 2 || !url.match(u[0])) // checking url match
			continue;

		console.debug('Used: ', u[0]);

		for(let c of u[1])
		{
			let cl=c.length;
			if(!cl)
				continue;

			switch(c[0])
			{
				case "css":
					if(cl == 3)
					{
						replacers.push(new CSSReplace(c[1], c[2]));
						continue;
					}

				case "txt":
					if(cl == 4)
					{
						replacers.push(new InnerTextReplace(c[1], c[2], c[3]));
						continue;
					}
				case "reg":
					if(cl >= 4 && cl <=5 )
					{
						replacers.push(new RegexReplace(c[1], c[2], c[3], cl==5 ? c[4] : false));
						continue;
					}

				case "att":
					if(cl == 4)
					{
						replacers.push(new AttributeReplace(c[1], c[2], c[3]));
						continue;
					}
			}
			console.debug('** Cfg Error: ', c);
		} // for c
	} // for u
	console.debug("Cfg Loaded: ", performance.now() - i, "ms");
})();

var doIt = function() {
	let i = performance.now();
	for(let r of replacers) {
		r.replace();
	}
	console.debug('Replace: ', performance.now() - i, "ms");
};

document.onreadystatechange = function () {
	switch (document.readyState) {
		case "loading":
			document.addEventListener('DOMContentLoaded', doIt);
			break;
		case "interactive":
			doIt();
			break;
		case "complete":
			$(document).on('new_post', function(e, post) {
				let i = performance.now();
				for(let r of new_posts_replacers) {
					r.replace(post);
				}
				console.debug('Replace: ', performance.now() - i, "ms");
			});
			doIt();
			break;
	}
};