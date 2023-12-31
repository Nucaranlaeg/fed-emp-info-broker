"use strict";

let games = [
	{name: "OKtC", opponent: "mcalhoon2@sbcglobal.net"}
];

let messages = [
	{subject: "0715", to: "mcalhoon2@sbcglobal.net", data: "C8 D6M 6D5 68/0"},
	{subject: "0714", to: "bennerguy@gmail.com", data: "CV+MEC+EFF 29/0"},
];

let currentGame = {name: "OKtC", opponent: "mcalhoon2@sbcglobal.net"};

const url = "https://us-central1-fed-emp-info-broker.cloudfunctions.net/backend";

function loadAllGames(games){
	const gamesNode = document.querySelector("#games");
	while (gamesNode.lastChild){
		gamesNode.removeChild(gamesNode.firstChild);
	}
	games.forEach(game => {
		const node = document.querySelector("#game").cloneNode(true);
		node.removeAttribute("id");
		node.querySelector(".name").innerHTML = game.name;
		node.querySelector(".opponent").innerHTML = game.opponent;
		node.onclick = () => {
			document.querySelectorAll(".game").forEach(gameNode => gameNode.classList.remove("selected"));
			node.classList.add("selected");
			loadGame(game);
		};
		gamesNode.appendChild(node);
	});
}

function loadMessages(messages){
	const pendingIn = document.querySelector("#pending-incoming");
	const pendingOut = document.querySelector("#pending-outgoing");
	while (pendingIn.lastChild){
		pendingIn.removeChild(pendingIn.firstChild);
	}
	while (pendingOut.lastChild){
		pendingOut.removeChild(pendingOut.firstChild);
	}
	messages.forEach(message => {
		let node;
		if (message.to === document.querySelector("#email").value){
			node = document.querySelector("#pending-in").cloneNode(true);
			node.querySelector(".data").innerHTML = message.data;
			pendingIn.appendChild(node);
			node.onclick = replyMessage(message, node);
		} else {
			node = document.querySelector("#pending-out").cloneNode(true);
			node.querySelector(".data textarea").innerHTML = message.data;
			pendingOut.appendChild(node);
			node.onclick = updateMessage(message, node);
		}
		node.querySelector(".name").innerHTML = message.subject;
		node.removeAttribute("id");
	});
}

function loadGame(game){
	currentGame = game;
	throw "NOT IMPLEMENTED";
}

function updateMessage(message, node){
	const data = {
		id: message.id,
		data: message.data,
	}
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
		getMessages();
	};
	xml.open("POST", url, true);
	data.type = "update message";
	xml.send(data);
}

function replyMessage(message, node){
	const data = {
		id: message.id,
		data: message.data,
		to: message.to,
		response: message.response,
	}
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
		getMessages();
	};
	xml.open("POST", url, true);
	data.type = "reply message";
	data.game = currentGame;
	xml.send(data);
}

function sendMessage(){
	const data = {
		subject: document.querySelector("#new-subject").value,
		to: currentGame.opponent,
		data: document.querySelector("#new-data").value,
		game: currentGame,
	}
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
		getMessages();
	};
	xml.open("POST", url, true);
	data.type = "send message";
	data.game = currentGame;
	xml.send(data);
}

function getGames() {
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
			loadAllGames(JSON.parse(xml.response));
		}
	};
	xml.open("POST", url, true);
	xml.send({type: "get games"});
}

function getGames() {
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
			loadMessages(JSON.parse(xml.response));
		}
	};
	xml.open("POST", url, true);
	xml.send({type: "get messages", game: currentGame});
}

function login(){
	const xml = new XMLHttpRequest();
	xml.onreadystatechange = () => {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200){
			loadMessages(JSON.parse(xml.response));
		}
	};
	xml.open("POST", url, true);
	xml.send({
		type: "login",
		email: document.querySelector("#email").value,
		password: document.querySelector("#password").value,
	});
}