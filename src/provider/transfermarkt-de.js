'use strict';

const logger = require('winston');
const lodash = require('lodash');
const superagent = require('superagent');
const cheerio = require('cheerio');

logger.cli();

const idMapping = require('./transfermarkt-team-ids.json');

class TransfermarktProxy {
  static marketValueStringToNumber(marketValueString) {
    if (!marketValueString) {
      logger.error(`Market value could not be determined`);
      return 0;
    }

    const split = marketValueString.split(' ');
    const factor = split[1] === 'Mio.' ? 1000000 : 1000;
    const value = parseFloat(split[0].replace(',', '.'));

    return factor * value;
  }

  static stringToInt(string) {
    return lodash.toSafeInteger(lodash.trim(string));
  }

  static stringToDouble(string) {
    if (!string) {
      logger.error(`string is undefined`);
      return 0;
    }
    const properFormat = string.replace(',', '.');
    return lodash.toNumber(lodash.trim(properFormat));
  }

  // http://www.transfermarkt.de/1-bundesliga/spieltag/wettbewerb/L1/plus/?saison_id=2015&spieltag=22 (Liga 1)
  // http://www.transfermarkt.de/fc-bayern-munchen/startseite/verein/27/saison_id/2015 <- Bayern (=27), 2015
  static getTeamInfo(teamCode, season) {
    const teamId = idMapping[teamCode].id;
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
}

TransfermarktProxy.getTeamInfo('FCB', '2015');

module.exports = TransfermarktProxy;
