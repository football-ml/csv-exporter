'use strict';

const logger = require('winston');
const lodash = require('lodash');
const superagent = require('superagent');
const cheerio = require('cheerio');

logger.cli();

const teamIdMapping = require('./transfermarkt-team-ids.json');
const leagueIdMapping = require('./transfermarkt-league-ids.json');

class TransfermarktProxy {
  static marketValueStringToNumber(marketValueString) {
    if (!marketValueString) {
      logger.error(`Market value could not be determined for input: %s`, marketValueString);
      return 0;
    }

    const split = marketValueString.split(' ');
    const factor = split[1] === 'Mio.' ? 1000000 : 1000;
    const value = lodash.toNumber(split[0].replace(',', '.'));

    return factor * value;
  }

  static tmTeamIdToTeamCode(tmId) {
    for (const id in teamIdMapping) {
      if (teamIdMapping[id].id === tmId) {
        return id;
      }
    }

    return '';
  }

  static stringToInt(string) {
    return lodash.toSafeInteger(lodash.trim(string));
  }

  static stringPercentageToDouble(string) {
    const cleansedString = string.replace(' %', '').replace(',', '.');
    const value = lodash.toNumber(cleansedString);

    return value / 100;
  }

  static stringToDouble(string) {
    if (!string) {
      logger.error(`string is undefined`);
      return 0;
    }
    const properFormat = string.replace(',', '.');
    return lodash.toNumber(lodash.trim(properFormat));
  }

  // http://www.transfermarkt.de/fc-bayern-munchen/startseite/verein/27/saison_id/2015 <- Bayern (=27), 2015
  static getTeamInfo(teamCode, season) {
    if (!teamIdMapping[teamCode]) {
      return new Promise((resolve) => {
        resolve({});
      });
    }

    const teamId = teamIdMapping[teamCode].id;
    const url = `http://www.transfermarkt.de/fc-bayern-munchen/startseite/verein/${teamId}/saison_id/${season}`;
    const info = {
      teamCode
    };

    return new Promise((resolve, reject) => {
      superagent
        .get(url)
        .end((err, res) => {
          if (err) {
            return reject(err);
          }

          const $ = cheerio.load(res.text);
          const teamMarketValueInfo = $('.marktwert a').text();
          const averagePlayerMarketValue = $('.profilheader').eq(1).children().last().find('td').html();
          const aInternationals = $('.profilheader').first().children().last().find('td').html();
          const averagePlayerAge = $('.profilheader').first().children().eq(2).find('td').html();

          info.teamMarketValue = TransfermarktProxy.marketValueStringToNumber(teamMarketValueInfo);
          info.averagePlayerMarketValue = TransfermarktProxy.marketValueStringToNumber(averagePlayerMarketValue);
          info.aInternationals = TransfermarktProxy.stringToInt(aInternationals);
          info.averagePlayerAge = TransfermarktProxy.stringToDouble(averagePlayerAge);

          resolve(info);
        });
    });
  }

  // http://www.transfermarkt.de/1-bundesliga/spieltag/wettbewerb/L1/plus/?saison_id=2015&spieltag=22 (Liga 1)
  static getMatchdayInfo(country, league, season, matchday) {
    const leagueInTMTerminology = leagueIdMapping[country][league];

    const tmNameShort = leagueInTMTerminology[0];
    const tmNameLong = leagueInTMTerminology[1];
    const url = `http://www.transfermarkt.de/${tmNameLong}/spieltag/wettbewerb/${tmNameShort}/plus`;

    return new Promise((resolve, reject) => {
      superagent
        .get(url)
        .query({
          saison_id: season,
          spieltag: matchday
        })
        .end((err, res) => {
          if (err) {
            return reject(err);
          }

          const $ = cheerio.load(res.text);
          const playdayInfo = [];

          $('.tm-user-tendenz').each((i, elem) => {
            const tr = $(elem);
            const tbody = tr.parent();

            const homeTeamId = tbody.find('.hide-for-small').eq(0).find('.vereinprofil_tooltip').eq(0).attr('id');
            const awayTeamId = tbody.find('.hide-for-small').eq(3).find('.vereinprofil_tooltip').eq(0).attr('id');

            const winHomeRaw = tr.find('.bar-sieg').html();
            const remisRaw = tr.find('.bar-remis').html();
            const winAwayRaw = tr.find('.bar-niederlage').html();

            const parsed = {
              homeTeam: TransfermarktProxy.tmTeamIdToTeamCode(homeTeamId),
              awayTeam: TransfermarktProxy.tmTeamIdToTeamCode(awayTeamId),
              tmWinHomeUserProb: TransfermarktProxy.stringPercentageToDouble(winHomeRaw),
              tmRemisUserProb: TransfermarktProxy.stringPercentageToDouble(remisRaw),
              tmWinAwayUserProb: TransfermarktProxy.stringPercentageToDouble(winAwayRaw)
            };

            playdayInfo.push(parsed);
          });

          resolve(playdayInfo);
        });
    });
  }
}

module.exports = TransfermarktProxy;
