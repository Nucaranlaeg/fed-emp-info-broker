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

exports.run = async (req, res) => {
	const body = req.body;
	// Do auth
	if (body.type === "get games"){
		const data = runQuery(`SELECT * FROM tables.games g WHERE EXISTS (SELECT * FROM tables.player_games pg WHERE player = ${body.player} AND g.id = pg.id)`);
		res.send(data);
	} else if (body.type === "get messages"){
		const id = body.game.id;
		const data = runQuery(`SELECT * FROM tables.messages m WHERE game_id = ${id}`);
		res.send(data);
	} else if (body.type === "send message"){
		const id = body.game.id;
		res.send(data);
	}
}
