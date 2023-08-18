const {BigQuery} = require("@google-cloud/bigquery");
const bigqueryClient = new BigQuery();
bigqueryClient.projectId = "fed-emp-info-broker";

async function runQuery(sqlQuery){
	const options = {
		query: sqlQuery,
		location: 'US',
	};
	const [rows] = await bigqueryClient.query(options);
	return rows;
}

const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for(let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

function rollResult(numdice, size){
	let total = 0;
	while (numdice-- > 0){
		total += Math.ceil(Math.random() * size);
	}
	return total;
}

function rollDice(msg){
	let match;
	while (true){
		try {
			[match] = msg.match(/\{\d+d\d+\}/);
		} catch {
			break;
		}
		let [numdice, size] = match.replaceAll(/{|}/g, "").split("d");
		msg = msg.replace(match, match.replace("{", "(").replace("}", ")") + ":" + rollResult(+numdice, +size) + " ");
	}
	return msg;
}

function sendEmail(addresses, contents){
	console.log("addresses:", addresses);
	console.log("contents:", contents);
}

exports.run = async (req, res) => {
	const body = req.body;
	// Input validation
	if (body.to?.includes('"') ||
		body.subject?.includes('"') ||
		body.data?.includes('"') ||
		body.player?.includes('"') ||
		body.opponent?.includes('"') ||
		(body.id && typeof body.id != "string")) throw "Validation Error";
	// Do auth
	let logged_in = false;
	if (body.token){
		const token = runQuery(`SELECT CASE WHEN last_login > DATETIME_SUB(CURRENT_DATETIME(), INTERVAL 1 WEEK) THEN token ELSE "" END FROM tables.players WHERE "${body.player}" = email`);
		if (token === body.token) logged_in = true;
	}
	if (!logged_in && !["email confirmation", "new user"].includes(body.type)){
		const hash = cyrb53(body.password).toString();
		const db_hash = runQuery(`SELECT password_hash FROM tables.players WHERE "${body.player}" = email`);
		if (hash !== db_hash) throw "Invalid password";
	}
	runQuery(`UPDATE tables.players SET last_login = CURRENT_DATETIME() WHERE "${body.player}" = email`);
	// Just in case we need it
	const newToken = Math.random().toString();
	// Get values
	switch (body.type){
		case "get games":
			data = runQuery(`SELECT * FROM tables.games WHERE "${body.player}" in UNNEST(players)`);
			res.send(data);
			break;
		case "get messages":
			data = runQuery(`SELECT * FROM tables.messages m WHERE game_id = ${body.game.id}`);
			res.send(data);
			break;
		case "send message":
			runQuery(`INSERT INTO tables.messages (game_id, to, subject, data, id) VALUES (${body.game.id}, "${body.to}", "${body.subject}", "${body.data}", SELECT MAX(id) + 1 FROM tables.messages)`);
			res.send();
			break;
		case "update message":
			runQuery(`UPDATE tables.messages SET data = "${body.data}" WHERE id = ${body.id} AND response IS NULL`);
			res.send();
			break;
		case "reply message":
			runQuery(`UPDATE tables.messages SET response = "${body.response}" WHERE id = ${body.id} AND response IS NULL`);
			const [players, msg] = runQuery(`SELECT players, data FROM tables.games WHERE id = ${body.game.id}`);
			const other_player = players.find(p => p !== body.to);
			const updated_msg = rollDice(msg);
			const updated_response = rollDice(body.response);
			sendEmail(players, `${other_player}:
${updated_msg}

${body.to}:
${updated_response}`);
			res.send();
			break;
		case "new game":
			runQuery(`INSERT INTO tables.games (id, players) VALUES (SELECT MAX(id) + 1 FROM tables.games, ["${body.player}", "${body.opponent}"])`);
			res.send();
			break;
		case "login":
			runQuery(`UPDATE tables.players SET token = "${newToken}" WHERE "${body.player}" = email`);
			res.send(newToken);
			break;
		case "new user":
			runQuery(`INSERT INTO tables.players (email, is_confirmed, last_login, password_hash) VALUES ("${body.player}", FALSE, CURRENT_DATETIME(), "${newToken}")`);
			sendEmail([body.player], `Please copy this number into the appropriate space on the site (along with a new password) to confirm your email address: ${newToken}`);
			break;
		case "email confirmation":
			const db_hash = runQuery(`SELECT password_hash FROM tables.players WHERE "${body.player}" = email`);
			if (body.confirmation === db_hash){
				const hash = cyrb53(body.password).toString();
				runQuery(`UPDATE tables.players SET password_hash = "${hash}", token = "${newToken}" WHERE "${body.player}" = email`);
				res.send(newToken);
			}
			break;
		default:
			throw `Action type ${body.type} not permitted`;
	}
}

/*
 * Tested:
 *
 * new user
 * 
 */ 