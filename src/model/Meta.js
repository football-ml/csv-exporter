'use strict';

const lodash = require('lodash');
const logger = require('winston');
logger.cli();

const TransfermarktProxy = require('../provider/transfermarkt-de');

class Meta {
  constructor(clubMeta) {
    this.clubMeta = clubMeta;

    if (!this.isMeaningfulData) {
      logger.warn('Club meta data is not meaningful. this will distort the result');
    }
  }

  get isMeaningfulData() {
    return lodash.every(this.clubMeta, val => Object.keys(val).length > 0);
  }

  getTeamValue(team) {
    return this.clubMeta[team].teamMarketValue;
  }

  getAveragePlayerMarketValue(team) {
    return this.clubMeta[team].averagePlayerMarketValue;
  }

  getNumberOfAInternationals(team) {
    return this.clubMeta[team].aInternationals;
  }

  getTeamMarketValueRatio(home, away) {
    return lodash.round(this.getTeamValue(home) / this.getTeamValue(away), 2);
  }

  getAveragePlayerMarketValueRatio(home, away) {
    return lodash.round(this.getAveragePlayerMarketValue(home) / this.getAveragePlayerMarketValue(away), 2);
  }

  getAInternationalsDelta(home, away) {
    return this.getNumberOfAInternationals(home) - this.getNumberOfAInternationals(away);
  }

  static getMetaForMatchDay(country, league, season, matchday) {
    const result = TransfermarktProxy.getMatchdayInfo(country, league, season, matchday);
    return result;
  }

  static getMetaForMatchDays(country, league, season, start, end) {
    const allMatchdays = {};
    for (let i = start; i <= end; i++) {
      allMatchdays[i] = TransfermarktProxy.getMatchdayInfo(country, league, season, i);
    }

    return allMatchdays;
  }
}

module.exports = Meta;
