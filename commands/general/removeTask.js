const Command = require('../../structures/CommandClass');

const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

const actionModel = require('../../models/action.model');
const logger = require('../../common/utils/logger');

/* It's getting a random kanji from a JSON file and getting the information about it. Then, it's
generating an image from the kanji and saving it to a file. Finally, it's creating an embed with
the information about the kanji */
module.exports = class RemoveTask extends Command {

	/**
	 * A constructor function. It is called when the class is instantiated.
	 * @param client - The client object
	 */
	constructor(client) {
		super(client, {
			data: new SlashCommandBuilder()
				.setName('removetask')
				.setDescription('Supprime une tâche programmée par son id')
				.addIntegerOption(option =>
					option.setName('id')
						.setDescription('Identifiant de la tâche à supprimer')
						.setRequired(true))
				.addChannelOption(option =>
					option.setName('channel')
						.setDescription('Filtre par salon')
						.setRequired(false)),
			usage: 'listScheduledTasks ID [channel]',
			category: 'kanji',
			permissions: ['Use Application Commands', 'Send Messages', 'Embed Links'],
		});
	}

	async run(client, interaction) {

		// Getting channel parameter
		const channel = interaction.options.getChannel('channel');

		// Getting id parameter
		const id = interaction.options.getInteger('id');

		// It's a way to send a message to the user without sending it right away.
		await interaction.deferReply();

		try {
			// It's getting the actions from the database.
			let action = {};
			if (channel && channel.id) {
				action = await actionModel.deleteActionByIdAndServerIdAndChannelId(id, interaction.guildId, channel.id);
			} else {
				action = await actionModel.deleteActionByIdAndServerId(id, interaction.guildId);
			}

			global.cronTasks.get(action.id).stop();
			global.cronTasks.delete(action.id);

			// Debugging
			logger.info(`Removing scheduled task with id n°${id} ${channel ? `for channel ${channel}` : ''}`);

			let message = '';
			message = `**#️⃣ Salon:** <#${action.channelId}>\n`;
			message += `**⚙️ Commande:** ${action.type}\n`;
			message += `**📅 Planification:** ${action.cron.replaceAll('*', '\\*')}\n`;
			if (action.mentionRole) {
				message += `**👤 Mentionne:** ${action.mentionRole}\n`;
			}
			if (action.parameters && action.parameters.message) {
				message += `**💬 Message:** ${action.parameters.message.slice(0, 30)}${action.parameters.message.length > 30 ? '...' : '' }\n`;
			}

			// It's creating an embed with the information about the kanji.
			const listEmbed = new MessageEmbed()
				.setTitle('**La tâche suivante vient d\'être supprimée**')
				.setColor(client.config.embedColor)
				.addFields({
					name: `N°${id}`,
					value: message,
					inline: false,
				})
				.setFooter({ text: `${interaction.member.guild.name}`, iconURL: interaction.member.guild.iconURL() })
				.setTimestamp();

			return await interaction.followUp({ embeds: [listEmbed] });
		} catch (e) {
			logger.error('Echec de la suppression d\'une tâche : ' + e);

			return await interaction.followUp({
				embeds: [new MessageEmbed()
					.setTitle('❌ Erreur lors de la suppression de la tâche')
					.setColor(client.config.embedColor)
					.setDescription('💬 L\'id renseignée est trop élevée')
					.setFooter({ text: `${interaction.member.guild.name}`, iconURL: interaction.member.guild.iconURL() })
					.setTimestamp(),
				],
			});
		}
	}
};