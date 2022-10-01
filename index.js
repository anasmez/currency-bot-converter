const fetch = require('node-fetch');
// Require the necessary discord.js classes
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CURRENCY_API_URL = 'https://api.coinbase.com/v2/exchange-rates?currency=EUR';
const UPDATE_INTERVAL = process.env.INTERVAL_TIME || 5 * 1000;

const config = {
	LAST_EUR_USD_RATE: undefined,
};
const botPresenceData = {
	status: 'online',
	activities: [{
		name: 'EUR-USD: ',
		type: ActivityType.Watching,
	}],
	afk: false,
};

if (!DISCORD_TOKEN) throw new Error('No token provided');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
	console.log('Ready!');
	updateBot();
	setInterval(updateBot, UPDATE_INTERVAL);
});

client.login(DISCORD_TOKEN);

async function getPrice() {
	try {
		const response = await fetch(CURRENCY_API_URL);
		const { data } = (await response.json());
		return data?.rates?.USD;
	} catch (error) {
		console.error('Failed to fetch', error);
	}
}

function formatMoneyString(string) {
	const decimalIndex = string.search('.');
	if (decimalIndex == -1) {
		return '$--.--';
	}
	return `$${string.substring(0, 6)}`;
}

function updateBotStatusMessage(status) {
	botPresenceData.activities[0].name = status;
	client.user.setPresence(botPresenceData);
}

function updateBotNickname(name) {
	for (const [, guild] of client.guilds.cache) {
		guild.members.me.setNickname(name);
	}
}

async function updateBot() {
	let newPrice = await getPrice();
	if (!newPrice) return;
	let emoji = '-';
	let percentage;
	if (config.LAST_EUR_USD_RATE && newPrice !== config.LAST_EUR_USD_RATE) {
		percentage = newPrice / config.LAST_EUR_USD_RATE;
		emoji = percentage > 0 ? '↗' : '↘';
		config.LAST_EUR_USD_RATE = newPrice;
	}
	newPrice = formatMoneyString(newPrice);
	const statusMessage = `%${ percentage }`.substring(0, 5);
	const nickname = `${ newPrice } (${ emoji })`;
	updateBotStatusMessage(statusMessage);
	updateBotNickname(nickname);
	console.log(`Activity set to ${ nickname }`);
}