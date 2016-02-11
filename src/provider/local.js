'use strict';

const logger = require('winston');
const appRootDir = require('app-root-dir').get();
const path = require('path');

logger.cli();

class LocalFileLoader {
  static getClubsAsJson(season, country, league) {
    return new Promise((resolve, reject) => {
      const clubsFilePath = `${season}/${season}.${league}.clubs.json`;

      try {
        const clubs = require(path.join(appRootDir, clubsFilePath)).clubs;

        resolve(clubs);
      } catch (e) {
        reject(e);
      }
    });
  }

  static getResultsAsJson(season, country, league) {
    return new Promise((resolve, reject) => {
      const resultsFilePath = `${season}/${season}.${league}.json`;

      try {
        const rounds = require(path.join(appRootDir, resultsFilePath)).rounds;

        resolve(rounds);
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = LocalFileLoader;
