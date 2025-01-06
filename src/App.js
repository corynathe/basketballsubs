import React, {useCallback, useEffect, useState, useMemo} from "react";
import { useStopwatch, useTimer } from 'react-timer-hook';
import { Button, Badge, Row, Col } from 'react-bootstrap';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const EVENT_LABELS = {
    '1pt': 'made a free throw',
    '2pt': 'made a 2pt basket',
    '3pt': 'made a 3 pointer',
    'Rebound': 'had a rebound',
    'Assist': 'had an assist',
    'Steal': 'stole the ball',
    'Block': 'blocked a shot',
    'GoodPass': 'made a good pass',
    'GoodShot': 'took a good shot',
    'GoodDef': 'played good on-ball defense',
    'HelpDef': 'played good help defense',
    'Hussle': 'made a nice hussle play',
    'Teammate': 'was a good teammate',
    'BadShot': 'took a bad shot',
    'Turnover': 'turned the ball over',
    'OpenShot': 'gave up an open shot',
};

const TEAM_EVENTS = ['BadShot', 'Turnover', 'OpenShot']
const SCORING_EVENTS = ['1pt', '2pt', '3pt']

let TIME = new Date();

function App() {
  const {
    totalSeconds,
    seconds: stopWatchSeconds,
    minutes: stopWatchMinutes,
    isRunning: stopWatchIsRunning,
    start: stopWatchStart,
    pause: stopWatchPause,
    reset: stopWatchReset,
  } = useStopwatch({autoStart: false});
  const {
    seconds: timerSeconds,
    minutes: timerMinutes,
    isRunning: timerIsRunning,
    start: timerStart,
    pause: timerPause,
    restart: timerRestart,
    resume: timerResume,
  } = useTimer({ expiryTimestamp: TIME, autoStart: false });
  const [clockTime, setClockTime] = useState(0);
  const [ourScore, setOurScore] = useState(0);
  const [theirScore, setTheirScore] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showStatsView, setShowStatsView] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState();
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);

  const applyPlayers = useCallback((name) => {
       document.getElementById('playersInput').value = "";
       const playerNames = [];
       document.getElementsByName(name).forEach(element => {
            playerNames.push(element.innerHTML);
       });
       document.getElementById('playersInput').value = playerNames.join('\n');
  }, []);

  const setInitPlayers = useCallback(() => {
    const inputVals = document.getElementById('playersInput').value
        .split('\n').map(val => val.trim()).filter(val => val !== '');

    const players_ = shuffle(inputVals)
        .map(name => ({name, points: 0, seconds: 0, isIn: false, comingOut: false, goingIn: false, inAt: undefined, outAt: undefined}));
    setPlayers(players_);
  }, []);

  const resetClockTime = useCallback(() => {
      TIME = new Date();
      TIME.setSeconds(TIME.getSeconds() + clockTime);
      timerRestart(TIME, false);
  }, [clockTime]);

  const addClockTime = useCallback(() => {
      setClockTime(current => current + 60);
  }, []);

  const removeClockTime = useCallback(() => {
      setClockTime(current => current > 60 ? current - 60 : 0);
  }, []);

  useEffect(() => {
    resetClockTime();
  }, [clockTime]);

  // sort players in the game by time in the game
  const playersInGame = players.filter(player => player.isIn)
        .sort((a, b) => (a.inAt || 0) - (b.inAt || 0));

  const playersGoingIn = players.filter(player => player.goingIn);

  // sort players on bench length of time they have been on the bench
    const playersOnBench = players.filter(player => !player.isIn && !player.goingIn)
        .sort((a, b) => (a.outAt || 0) - (b.outAt || 0));

    useEffect(() => {
        if (stopWatchIsRunning) {
            const interval = setInterval(() => {
                setPlayers(current => current.map(player => {
                    if (player.isIn) {
                        return {...player, seconds: player.seconds + 1};
                    }
                    return player;
                }));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [stopWatchIsRunning]);

    const resetAll = useCallback(() => {
        setEvents([]);
        setSelectedEvent(undefined);
        stopWatchReset(undefined, false);
        resetClockTime();
        setConfirmReset(false);
        setPlayers([]);
        setOurScore(0);
        setTheirScore(0);
    }, [stopWatchReset, resetClockTime]);

    const start_ = useCallback(() => {
        stopWatchStart();
        timerResume();
    }, [stopWatchStart, timerResume]);

    const pause_ = useCallback(() => {
        stopWatchPause();
        timerPause();
    }, [stopWatchPause, timerPause]);

    const toggleConfirmReset = useCallback(() => {
        setConfirmReset(current => !current);
    }, []);

    const toggleShowStats = useCallback(() => {
        setShowStatsView(current => !current);
    }, []);

  const goingIn = useCallback((evt) => {
      const selected = getTarget(evt);
      if (!selected) return;
      setPlayers(current => current.map(player => {
            if (player.name === selected) {
                return {...player, goingIn: true};
            }
            return player;
      }));
  }, []);

  const notGoingIn = useCallback((evt) => {
        const selected = getTarget(evt);
        if (!selected) return;
        setPlayers(current => current.map(player => {
                if (player.name === selected) {
                    return {...player, goingIn: false};
                }
                return player;
        }));
  }, []);

  const comingOut = useCallback((evt) => {
        const selected = getTarget(evt);
        if (!selected) return;
        setPlayers(current => current.map(player => {
            if (player.name === selected) {
                return {...player, comingOut: !player.comingOut};
            }
            return player;
        }));
  }, []);

  const substitute = useCallback(() => {
        setPlayers(current => {
            return current.map(player => {
                if (player.goingIn) {
                    return {...player, isIn: true, inAt: totalSeconds, goingIn: false};
                }
                if (player.comingOut) {
                    return {...player, isIn: false, outAt: totalSeconds, comingOut: false};
                }
                return player;
            });
        });
  }, [totalSeconds]);

  const applyEvent = useCallback(selectedPlayer => {
    if (selectedEvent) {
        const isTeamEvent = TEAM_EVENTS.indexOf(selectedEvent) > -1;
        const isThem = selectedPlayer === 'them';
        const isUs = selectedPlayer === 'us';
        setEvents(current => [{
            name: isTeamEvent || isThem || isUs ? undefined : selectedPlayer,
            team: isThem ? 'them' : 'us',
            event: selectedEvent,
            seconds: totalSeconds,
            message: (isThem ? 'They' : (isTeamEvent || isUs ? 'We' : selectedPlayer)) + ' ' + EVENT_LABELS[selectedEvent],
        }, ...current]);
        setSelectedEvent(undefined);

        if (SCORING_EVENTS.indexOf(selectedEvent) > -1) {
            const points = selectedEvent === '1pt' ? 1 : (selectedEvent === '2pt' ? 2 : 3);
            if (isUs) setOurScore(curr => curr + points);
            if (isThem) setTheirScore(curr => curr + points);
        }
    }
  }, [selectedEvent, totalSeconds]);

  const select1Pt = useCallback(() => setSelectedEvent(curr => curr === '1pt' ? undefined : '1pt'), []);
  const select2Pt = useCallback(() => setSelectedEvent(curr => curr === '2pt' ? undefined : '2pt'), []);
  const select3Pt = useCallback(() => setSelectedEvent(curr => curr === '3pt' ? undefined : '3pt'), []);
  const selectRebound = useCallback(() => setSelectedEvent(curr => curr === 'Rebound' ? undefined : 'Rebound'), []);
  const selectAssist = useCallback(() => setSelectedEvent(curr => curr === 'Assist' ? undefined : 'Assist'), []);
  const selectSteal = useCallback(() => setSelectedEvent(curr => curr === 'Steal' ? undefined : 'Steal'), []);
  const selectBlock = useCallback(() => setSelectedEvent(curr => curr === 'Block' ? undefined : 'Block'), []);
  const selectGoodPass = useCallback(() => setSelectedEvent(curr => curr === 'GoodPass' ? undefined : 'GoodPass'), []);
  const selectGoodShot = useCallback(() => setSelectedEvent(curr => curr === 'GoodShot' ? undefined : 'GoodShot'), []);
  const selectGoodDef = useCallback(() => setSelectedEvent(curr => curr === 'GoodDef' ? undefined : 'GoodDef'), []);
  const selectHelpDef = useCallback(() => setSelectedEvent(curr => curr === 'HelpDef' ? undefined : 'HelpDef'), []);
  const selectHussle = useCallback(() => setSelectedEvent(curr => curr === 'Hussle' ? undefined : 'Hussle'), []);
  const selectTeammate = useCallback(() => setSelectedEvent(curr => curr === 'Teammate' ? undefined : 'Teammate'), []);
  const selectBadShot = useCallback(() => setSelectedEvent(curr => curr === 'BadShot' ? undefined : 'BadShot'), []);
  const selectTurnover = useCallback(() => setSelectedEvent(curr => curr === 'Turnover' ? undefined : 'Turnover'), []);
  const selectOpenShot = useCallback(() => setSelectedEvent(curr => curr === 'OpenShot' ? undefined : 'OpenShot'), []);

  if (players.length === 0) {
    return (
        <Row className="player-input-view">
            <Col>
                <textarea id="playersInput" rows="20" cols="40"></textarea>
                <div>
                    <Button variant="success" onClick={setInitPlayers}>Start</Button>
                </div>
            </Col>
            <Col>
                <div style={{fontWeight: 'bold'}}>5th Grade Boys</div>
                <div name="player5" className="player-input-name" className="player-input-name">Sawyer</div>
                <div name="player5" className="player-input-name">Kalim</div>
                <div name="player5" className="player-input-name">Brody</div>
                <div name="player5" className="player-input-name">Caleb</div>
                <div name="player5" className="player-input-name">Wesley</div>
                <div name="player5" className="player-input-name">John</div>
                <div name="player5" className="player-input-name">Jaxson</div>
                <div name="player5" className="player-input-name">Travis</div>
                <div name="player5" className="player-input-name">Killian</div>
                <div name="player5" className="player-input-name">Danny</div>
                <div name="player5" className="player-input-name">Adrian</div>
                <div name="player5" className="player-input-name">Chris</div>
                <div name="player5" className="player-input-name">Henry</div>
                <div name="player5" className="player-input-name">Noah</div>
                <div><Button variant="outline-secondary" onClick={() => applyPlayers('player5')}>Apply</Button></div>
                <br/>
                <div style={{fontWeight: 'bold'}}>3rd Grade Boys</div>
                <div name="player3" className="player-input-name">Keaton</div>
                <div name="player3" className="player-input-name">Logan</div>
                <div name="player3" className="player-input-name">Kamden</div>
                <div name="player3" className="player-input-name">Hudson</div>
                <div name="player3" className="player-input-name">August</div>
                <div name="player3" className="player-input-name">Bode</div>
                <div name="player3" className="player-input-name">Axel</div>
                <div name="player3" className="player-input-name">Tucker</div>
                <div name="player3" className="player-input-name">Noah</div>
                <div name="player3" className="player-input-name">Luke</div>
                <div name="player3" className="player-input-name">Odin</div>
                <div name="player3" className="player-input-name">Lennox</div>
                <div name="player3" className="player-input-name">Easton</div>
                <div name="player3" className="player-input-name">Michael</div>
                <div><Button variant="outline-secondary" onClick={() => applyPlayers('player3')}>Apply</Button></div>
            </Col>
        </Row>
    )
  }

  if (showStatsView) {
    return <StatsView players={players} events={events} toggleShowStats={toggleShowStats} ourScore={ourScore} theirScore={theirScore} />
  }

  return (
      <div className="App">
        <div className="header">
          <Row>
            <Col>
                <Button variant="outline-secondary" size="sm" className="game-clock-btn" onClick={addClockTime}> + </Button>
              <div className="game-seconds-counter">
                <span>{String(timerMinutes).padStart(2, '0')}</span>:<span>{String(timerSeconds).padStart(2, '0')}</span>
              </div>
              <Button variant="outline-secondary" size="sm" className="game-clock-btn" onClick={removeClockTime}> - </Button>
            </Col>
            <Col>
              <table className="score-board">
                <tbody>
                    <tr><td className="score-value">{ourScore}</td><td className="score-value"> - </td><td className="score-value">{theirScore}</td></tr>
                    <tr><td className="score-name">US</td><td></td><td className="score-name">THEM</td></tr>
                </tbody>
              </table>
            </Col>
          </Row>
          <Row>
            <Col>
                {!stopWatchIsRunning && <Button variant="success" onClick={start_}>Start</Button>}
                {stopWatchIsRunning && <Button variant="danger" onClick={pause_}>Stop</Button>}
                <Button variant="primary" style={{marginLeft: 50}} onClick={substitute}>SUBS</Button>
            </Col>
            <Col>
                <Button variant="info" onClick={toggleShowStats}>Stats</Button>
                {!confirmReset && <Button variant="secondary" style={{marginLeft: 50}} onClick={toggleConfirmReset}>Reset</Button>}
                {confirmReset && <Button variant="secondary" style={{marginLeft: 50}} onClick={toggleConfirmReset}>Cancel Reset</Button>}
                {confirmReset && <div>Are you sure you want to reset all info?</div>}
                {confirmReset && <Button variant="danger" style={{marginLeft: 50}} onClick={resetAll}>YES</Button>}
            </Col>
          </Row>
        </div>
        <Row>
            <Col>
                <div className="col-title">IN</div>
                <div className="col-content">
                    {playersInGame.map(player => <PlayerCard key={player.name} onClick={comingOut} totalSeconds={totalSeconds} {...player} />)}
                </div>
            </Col>
            <Col>
                <div className="col-title">NEXT</div>
                <div className="col-content">
                    {playersGoingIn.map(player => <PlayerCard key={player.name} onClick={notGoingIn} {...player} />)}
                </div>
            </Col>
        </Row>
        <Row>
            <Col>
                <div className="col-title">EVENTS</div>
                <div className="col-content">
                    <Row>
                        <Col xs={8}>
                            <Button variant={selectedEvent === "1pt" ? "info" : "outline-info"} onClick={select1Pt}>+1 pt</Button>
                            <Button variant={selectedEvent === "2pt" ? "info" : "outline-info"} onClick={select2Pt}>+2 pt</Button>
                            <Button variant={selectedEvent === "3pt" ? "info" : "outline-info"} onClick={select3Pt}>+3 pt</Button>
                            <br/>
                            <Button variant={selectedEvent === "Rebound" ? "success" : "outline-success"} onClick={selectRebound}>REB</Button>
                            <Button variant={selectedEvent === "Assist" ? "success" : "outline-success"} onClick={selectAssist}>AST</Button>
                            <Button variant={selectedEvent === "Steal" ? "success" : "outline-success"} onClick={selectSteal}>STL</Button>
                            <Button variant={selectedEvent === "Block" ? "success" : "outline-success"} onClick={selectBlock}>BLK</Button>
                            <br/>
                            <Button variant={selectedEvent === "GoodPass" ? "success" : "outline-success"} onClick={selectGoodPass}>Good Pass</Button>
                            <Button variant={selectedEvent === "GoodShot" ? "success" : "outline-success"} onClick={selectGoodShot}>Good Shot</Button>
                            <br/>
                            <Button variant={selectedEvent === "GoodDef" ? "success" : "outline-success"} onClick={selectGoodDef}>Good Def</Button>
                            <Button variant={selectedEvent === "HelpDef" ? "success" : "outline-success"} onClick={selectHelpDef}>Help Def</Button>
                            <br/>
                            <Button variant={selectedEvent === "Hussle" ? "success" : "outline-success"} onClick={selectHussle}>Hussle</Button>
                            <Button variant={selectedEvent === "Teammate" ? "success" : "outline-success"} onClick={selectTeammate}>Teammate</Button>
                            <br/>
                            <Button variant={selectedEvent === "BadShot" ? "warning" : "outline-warning"} onClick={selectBadShot}>Bad Shot</Button>
                            <Button variant={selectedEvent === "Turnover" ? "warning" : "outline-warning"} onClick={selectTurnover}>Turnover</Button>
                            <Button variant={selectedEvent === "OpenShot" ? "warning" : "outline-warning"} onClick={selectOpenShot}>Open Shot</Button>
                        </Col>
                        <Col xs={4}>
                            {playersInGame.map(player =>
                                <Button key={player.name} variant="outline-dark" style={{width: '100%'}} onClick={() => applyEvent(player.name)}>
                                    {player.name}
                                </Button>
                            )}
                            <Button key="us" variant="outline-primary" style={{width: '100%'}} onClick={() => applyEvent('us')}>
                                US
                            </Button>
                            <Button key="them" variant="outline-primary" style={{width: '100%'}} onClick={() => applyEvent('them')}>
                                THEM
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Col>
            <Col>
                <div className="col-title">BENCH</div>
                <div className="col-content">
                    {playersOnBench.map(player => <PlayerCard key={player.name} onClick={goingIn} {...player} />)}
                </div>
            </Col>
        </Row>
      </div>
  );
}

const StatsView = ({events, players, toggleShowStats, ourScore, theirScore}) => {
  const perPlayerEvents = useMemo(() => {
    const events_ = {};
    events.forEach(event => {
        const name = event.name ?? event.team;
        if (!events_[name]) events_[name] = {};
        if (!events_[name][event.event]) events_[name][event.event] = 0;
        events_[name][event.event]++;
    });
    return events_;
  }, [events]);

    return (
      <>
        <Button variant="outline-secondary" onClick={toggleShowStats} style={{marginLeft: 25}}>Back</Button>
        <Row>
        <Col>
          <table className="score-board">
            <tbody>
                <tr><td className="score-value">{ourScore}</td><td className="score-value"> - </td><td className="score-value">{theirScore}</td></tr>
                <tr><td className="score-name">US</td><td></td><td className="score-name">THEM</td></tr>
            </tbody>
          </table>
      </Col>
      </Row>
        <Row>
            <Col>
                <table className="stats">
                    <thead>
                        <tr>
                            <th>Player<br/>Name</th>
                            <th>Playing<br/>Time</th>
                            <th>Points<br/>Scored</th>
                            <th>Rebound</th>
                            <th>Assist</th>
                            <th>Steal</th>
                            <th>Block</th>
                            <th>Good<br/>Pass</th>
                            <th>Good<br/>Shot</th>
                            <th>Good<br/>Def</th>
                            <th>Help<br/>Def</th>
                            <th>Hussle<br/>Play</th>
                            <th>Good<br/>Teammate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map(player => {
                            const playerEvents = perPlayerEvents[player.name];
                            const m = Math.floor(player.seconds / 60);
                            const s = player.seconds % 60;
                            const points = (playerEvents?.['1pt'] ?? 0) + 2*(playerEvents?.['2pt'] ?? 0) + 3*(playerEvents?.['3pt'] ?? 0);
                            return (
                                <tr key={player.name}>
                                    <td>{player.name}</td>
                                    <td className="stat-value">{m}m {s}s</td>
                                    <td className="stat-value">{points > 0 && points}</td>
                                    <td className="stat-value">{playerEvents?.['Rebound']}</td>
                                    <td className="stat-value">{playerEvents?.['Assist']}</td>
                                    <td className="stat-value">{playerEvents?.['Steal']}</td>
                                    <td className="stat-value">{playerEvents?.['Block']}</td>
                                    <td className="stat-value">{playerEvents?.['GoodPass']}</td>
                                    <td className="stat-value">{playerEvents?.['GoodShot']}</td>
                                    <td className="stat-value">{playerEvents?.['GoodDef']}</td>
                                    <td className="stat-value">{playerEvents?.['HelpDef']}</td>
                                    <td className="stat-value">{playerEvents?.['Hussle']}</td>
                                    <td className="stat-value">{playerEvents?.['Teammate']}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </Col>
        </Row>
        <Row>
            <Col>
                <div className="stats-header">US</div>
                {Object.keys(perPlayerEvents?.['us'] ?? {}).map(key => (
                    <div className="stats-value" key={key}>{key}: {perPlayerEvents?.['us'][key]}</div>
                ))}
            </Col>
            <Col>
                <div className="stats-header">THEM</div>
                {Object.keys(perPlayerEvents?.['them'] ?? {}).map(key => (
                    <div className="stats-value" key={key}>{key}: {perPlayerEvents?.['them'][key]}</div>
                ))}
            </Col>
        </Row>
        <Row>
            <Col>
                <div className="stats-header">TIMELINE</div>
                <div className="stats-timeline">
                    {events.map((event, i) => (
                        <Row key={i}>
                            <Col>
                              {event.seconds}s: {event.message}
                            </Col>
                        </Row>
                    ))}
                </div>
                <br/>
                <br/>
                <br/>
                <br/>
            </Col>
        </Row>
      </>
    )
}

const PlayerCard = ({name, seconds, isIn, comingOut, goingIn, inAt, totalSeconds, onClick}) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const diffM = Math.floor((totalSeconds - inAt) / 60);
    const diffS = (totalSeconds - inAt) % 60;
    const classNames = ['player-card', 'alert'];
    if (isIn && !comingOut) classNames.push('alert-success');
    if (isIn && comingOut) classNames.push('alert-primary');
    if (goingIn) classNames.push('alert-primary');
    if (!isIn && !goingIn) classNames.push('alert-light');

    return (
        <Row className={classNames.join(' ')} data-name={name} onClick={onClick}>
            <Col xs={5}>
                <div>{name}</div>
            </Col>
            <Col xs={7}>
                {isIn && <span className='player-seconds-current'>({diffM}m {diffS}s)</span>}
                <span className='player-seconds'>{m}m {s}s</span>
            </Col>
        </Row>
    );
}

function shuffle(orig) {
    const array = [...orig];
    for (var i = array.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function getTarget(evt) {
    let target = evt.target;
    if (target.classList.contains('badge')) {
        return;
    }

    while (!target.hasAttribute('data-name')) {
        target = target.parentElement;
    }
    return target.getAttribute('data-name');
}

export default App;
