const { SlashCommand, CommandOptionType } = require('slash-create');
const low = require('lowdb');
const Discord = require('discord.js');
const { checkDays, rain } = require('../../../../../HELPERS/functions');
const StatData = require('../../../../../MODELS/StatUses/stat_voice');
const InviteData = require('../../../../../MODELS/StatUses/stat_invite');
const RegData = require('../../../../../MODELS/Datalake/membership');
const { stripIndent } = require('common-tags');
const IDS = require('../../../../../BASE/personels.json');
const Profile = require('../../../../../MODELS/Economy/profile');
const roleXp = require('../../../../../MODELS/Economy/xp_role');
module.exports = class HelloCommand extends SlashCommand {
    constructor(creator) {
        super(creator, {
            name: 'stat',
            description: 'Statları gösterir',
            options: [
                {
                    type: CommandOptionType.STRING,
                    name: 'tür',
                    description: 'Statın türünü belirtiniz',
                    choices: [
                        {
                            name: 'davet',
                            value: 'invite'
                        },
                        {
                            name: 'kayıt',
                            value: 'registry'
                        },
                        {
                            name: 'ses',
                            value: 'voice'
                        }
                    ],
                    required: true
                },
                {
                    type: CommandOptionType.INTEGER,
                    name: 'gün',
                    description: 'Kaç güne kadar statları görmek istersin?'
                },
                {
                    type: CommandOptionType.USER,
                    name: 'kullanıcı',
                    description: 'Hangi kullanıcının statına bakacaksın?'
                }
            ],
            guildIDs: [IDS.guild],
            deferEphemeral: false,
            throttling: {
                duration: 60,
                usages: 1
            }
        });

        this.filePath = __filename;
    }

    async run(ctx) {
        const client = ctx.creator.client;
        console.log(ctx.options);
        const utils = await low(client.adapters('utils'));
        const roles = await low(client.adapters('roles'));
        const emojis = await low(client.adapters('emojis'));
        const channels = await low(client.adapters('channels'));
        const userID = ctx.options["kullanıcı"] || ctx.member.user.id;
        const mentioned = client.guilds.cache.get(ctx.guildID).members.cache.get(userID);
        let days = ctx.options["gün"] || 7;
        const type = ctx.options["tür"];
        const guild = client.guilds.cache.get(ctx.guildID);


        function bar(point, maxPoint) {
            const deger = Math.trunc(point * 10 / maxPoint);
            let str = "";
            for (let index = 2; index < 9; index++) {
                if ((deger / index) >= 1) {
                    str = str + emojis.get("ortabar_dolu").value()
                } else {
                    str = str + emojis.get("ortabar").value()
                }
            }
            if (deger === 0) {
                str = `${emojis.get("solbar").value()}${str}${emojis.get("sagbar").value()}`
            } else if (deger === 10) {
                str = `${emojis.get("solbar_dolu").value()}${str}${emojis.get("sagbar_dolu").value()}`
            } else {
                str = `${emojis.get("solbar_dolu").value()}${str}${emojis.get("sagbar").value()}`
            }
            return str;
        }

        const ranks = await roleXp.find();
        const myRank = ranks.find(rank => mentioned.roles.cache.has(rank._id));
        //console.log(ranks.sort((a, b) => b.requiredXp - a.requiredXp).map(r => member.guild.roles.cache.get(r._id).name));
        const nextRank = ranks.sort((a, b) => a.requiredXp - b.requiredXp).find(rank => rank.requiredXp > (myRank ? myRank.requiredXp : 0));
        console.log(nextRank);
        const profile = await StatData.findOne({ _id: mentioned.user.id });
        const myXp = profile.records.map(p => p.xp).reduce((a, c) => a + c, 0);
        console.log(myXp);
        switch (type) {
            case 'voice':
                const Data = await StatData.findOne({ _id: mentioned.user.id });
                if (!Data) return ctx.send(`${emojis.get("kullaniciyok").value()} Data bulunamadı.`);
                const records = Data.records.filter(r => checkDays(r.enter) < days);
                const responseEmbed = new Discord.MessageEmbed().setDescription(stripIndent`
                ${mentioned} kişisine ait ${days} günlük ses bilgileri:
                
                __**Public Ses İstatistikleri**__
                Toplam ses: \`${Math.floor(records.filter(r => r.channelType === "st_public").map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_public").map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Mikrofon kapalı: \`${Math.floor(records.filter(r => r.channelType === "st_public").filter(r => r.selfMute).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_public").filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kulaklık kapalı: \`${Math.floor(records.filter(r => r.channelType === "st_public").filter(r => r.selfDeaf).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_public").filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Yayın Açık: \`${Math.floor(records.filter(r => r.channelType === "st_public").filter(r => r.streaming).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_public").filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kamera Açık: \`${Math.floor(records.filter(r => r.channelType === "st_public").filter(r => r.videoOn).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_public").filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                ───────────────────
                __**Secret Ses İstatistikleri**__
                Toplam ses: \`${Math.floor(records.filter(r => r.channelType === "st_private").map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_private").map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Mikrofon kapalı: \`${Math.floor(records.filter(r => r.channelType === "st_private").filter(r => r.selfMute).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_private").filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kulaklık kapalı: \`${Math.floor(records.filter(r => r.channelType === "st_private").filter(r => r.selfDeaf).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_private").filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Yayın Açık: \`${Math.floor(records.filter(r => r.channelType === "st_private").filter(r => r.streaming).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_private").filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kamera Açık: \`${Math.floor(records.filter(r => r.channelType === "st_private").filter(r => r.videoOn).map(r => r.duration).length > 0 ? records.filter(r => r.channelType === "st_private").filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                ───────────────────
                __**Toplam Ses İstatistikleri**__
                Toplam ses: \`${Math.floor(records.map(r => r.duration).length > 0 ? records.map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Mikrofon kapalı: \`${Math.floor(records.filter(r => r.selfMute).map(r => r.duration).length > 0 ? records.filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kulaklık kapalı: \`${Math.floor(records.filter(r => r.selfDeaf).map(r => r.duration).length > 0 ? records.filter(r => r.selfMute).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Yayın Açık: \`${Math.floor(records.filter(r => r.streaming).map(r => r.duration).length > 0 ? records.filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                Kamera Açık: \`${Math.floor(records.filter(r => r.videoOn).map(r => r.duration).length > 0 ? records.filter(r => r.streaming).map(r => r.duration).reduce((a, b) => a + b, 0) / 60000 : 0)} dakika\`
                ${!mentioned.roles.cache.has(roles.get("cmd-crew").value()) ? "" : `
                ───────────────────
                __**Yetki Atlama Durumu**__
                ${bar(myXp, nextRank.requiredXp)}`} \`${myXp}/${nextRank.requiredXp}\`
                `).setThumbnail(mentioned.user.displayAvatarURL({ type: 'gif' })).setColor(mentioned.displayHexColor).setTitle(guild.name);
                return await ctx.send({
                    embeds: [responseEmbed]
                });

            case 'invite':
                const DataInv = await InviteData.findOne({ _id: mentioned.user.id });
                if (!DataInv) return await ctx.send(`${emojis.get("kullaniciyok").value()} Data bulunamadı.`);
                const embed = new Discord.MessageEmbed().setColor('#2f3136').setDescription(stripIndent`
                Kullanıcı: **${mentioned.user.username}**
                Davet sayısı: ${DataInv.records.length}
                Sunucuda olan davet ettiği kişi sayısı: ${DataInv.records.filter(rec => message.guild.members.cache.get(rec.user)).length}
                `).setThumbnail(mentioned.user.displayAvatarURL({ type: 'gif' })).setColor(mentioned.displayHexColor).setTitle(guild.name);
                return await ctx.send({
                    embeds: [embed]
                });

            case 'registry':
                const datam = await RegData.find({ executor: mentioned.user.id });
                if (!datam) return ctx.send(`${emojis.get("kullaniciyok").value()} Data bulunamadı.`);

                const embedD = new Discord.MessageEmbed().setColor('#2f3136').setDescription(stripIndent`
                Kullanıcı: **${mentioned.user.username}**
                Kayıt sayısı: ${datam.length}
                Bugünkü kayıt sayısı: ${datam.filter(data => checkDays(data.created) <= 1).length} 
                Haftalık kayıt sayısı: ${datam.filter(data => checkDays(data.created) <= 7).length} 
                `).setThumbnail(mentioned.user.displayAvatarURL({ type: 'gif' })).setColor(mentioned.displayHexColor).setTitle(guild.name);

                return await ctx.send({
                    embeds: [embedD]
                });

            default:
                break;
        }
    }
}
