'use strict';

const logger = require('winston');
const superagent = require('superagent');

logger.cli();

class GitHubProxy {
  static getClubsAsJson(season, country, league) {
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${country}.${league}.clubs.json`;

    return new Promise((resolve, reject) => {
      superagent
        .get(url)
        .end((err, res) => {
          if (err) {
            return reject(err);
          }

          const clubs = JSON.parse(res.text).clubs;
          resolve(clubs);
        });
    });
  }

  static getResultsAsJson(season, country, league) {
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${country}.${league}.json`;

    return new Promise((resolve, reject) => {
      superagent
        .get(url)
        .end((err, res) => {
          if (err) {
            return reject(err);
          }

          const rounds = JSON.parse(res.text).rounds;
          resolve(rounds);
        });
    });
  }
}

module.exports = GitHubProxy;
