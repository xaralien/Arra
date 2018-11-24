const { Client } = require('discord.js');
const yt = require('ytdl-core');
const tokens = require('./tokens.json');
const client = new Client();

let queue = {};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Already Playing');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.sendMessage('paused').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.sendMessage('resumed').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.sendMessage('skipped').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'time')){
					msg.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[2];
		if (url == '' || url === undefined) return msg.channel.sendMessage(`You must add a YouTube video url, or id after ${tokens.prefix}add`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage(`Add some songs to the queue first with ${tokens.prefix}add`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ['```xl',tokens.prefix + 'waiting : " Still Waiting!"',tokens.prefix + 'ferguso : " Not that easy Ferguso!"',tokens.prefix + 'ciduk : "hmmm......"', tokens.prefix + 'angry : "Angry Command"', tokens.prefix + 'join : "Join Voice channel of msg sender"',	tokens.prefix + 'add : "Add a valid youtube link to the queue"', tokens.prefix + 'queue : "Shows the current queue, up to 15 songs shown."', tokens.prefix + 'play : "Play the music queue if already joined to a voice channel"', '', 'the following commands only function while the play command is running:'.toUpperCase(), tokens.prefix + 'pause : "pauses the music"',	tokens.prefix + 'resume : "resumes the music"', tokens.prefix + 'skip : "skips the playing song"', tokens.prefix + 'time : "Shows the playtime of the song."',	'volume+(+++) : "increases volume by 2%/+"',	'volume-(---) : "decreases volume by 2%/-"',	'```'];
		msg.channel.sendMessage(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == tokens.adminID) process.exit(); //Requires a node module like Forever to work.
	},
	'avatar': (msg) => {
		var embed = new client.RichEmbed()
            .addField("Your Avatar", "hmmm....")
            .setImage(msg.author.avatarURL)
            msg.channel.sendEmbed(embed);
	},
	'info': (msg) => {
		var embed = new client.RichEmbed()
                .addField("Hello!", "My name is Arra, This is from the name of my owner Arra");
            msg.channel.sendEmbed(embed);
	},
	'angry': (msg) => {
		msg.channel.send("Sharingan!!!", {files: ["https://media.giphy.com/media/ZL2iRxhnDwtSE/giphy.gif"]});
	},
	'ciduk': (msg) => {
		msg.channel.send("hmmm.....", {files: ["img/ara.jpg"]});
	},
	'ferguso': (msg) => {
		msg.channel.send("", {files: ["https://media.discordapp.net/attachments/440518356798537739/509630012425502771/45491625_327822608046422_7053969203648266240_n.jpg"]});
	},
	'hello': (msg) => {
		msg.channel.send("", {files: ["https://image.myanimelist.net/ui/1Qejjs8xIEoZvC_d6tjFlfgWnKTVmMY1zIE63ewr3ojUbcPxI_7mRnSU1oGENZNMf9YAKf3-Fw_IxHIiSJCNQFQa8vpkT49s_l3DzSeDy61U-WisEXpk1ZkLI4Xl5NU5nOq0p20JYrsQ1UhvlHtmvA"]});
	},
	'baka': (msg) => {
		msg.channel.send("", {files: ["http://pm1.narvii.com/6511/5f5c48c50768d5ac75a9e7ff6239e41fbcabcff2_00.jpg"]});
	},
	'waiting': (msg) => {
		msg.channel.send("Still Waiting!", {files: ["https://thumbs.gfycat.com/ImpracticalHarshBangeltiger-small.gif"]});
	}
};

client.on('ready', () => {
	console.log('ready!');

	client.user.setStatus('Online')// Your status goes here; It can be 'Online','Idle','Invisible', & 'dnd'

	// Game & Streaming
	// You can change the string to whatever you want it to say.
	// To set a stream, add another option like this:
	client.user.setPresence({
        game: {
            name: 'Ur Bullshit',
            type: "LISTENING"
        }
    });
});

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});
client.login(tokens.d_token);
