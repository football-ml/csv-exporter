'use strict';

const HOME_TEAM_WIN = 'H';
const AWAY_TEAM_WIN = 'A';
const DRAW = 'X';

class Match {
  constructor(match, roundNr) {
    Object.assign(this, match);

    this.round = roundNr;
    this.result = this.getResult();
  }

  get isHomeTeamWin() {
    return this.result === HOME_TEAM_WIN;
  }

  get isDraw() {
    return this.result === DRAW;
  }

  get homeTeam() {
    return this.team1.code;
  }

  get awayTeam() {
    return this.team2.code;
  }

  get teams() {
    return {
      home: this.homeTeam,
      away: this.awayTeam
    };
  }

  get isAwayTeamWin() {
    return this.result === AWAY_TEAM_WIN;
  }

  getResult() {
    if (this.score1 === null || this.score2 === null) {
      return undefined;
    }

    if (this.score1 > this.score2) {
      return HOME_TEAM_WIN;
    }


    return this.score1 < this.score2 ? AWAY_TEAM_WIN : DRAW;
  }

  get hasBeenPlayed() {
    return this.score1 !== null && this.score2 !== null;
  }
}

module.exports = Match;
