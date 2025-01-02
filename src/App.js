import React, {useCallback, useEffect, useState} from "react";
import { useStopwatch } from 'react-timer-hook';
import { Button, Badge, Row, Col } from 'react-bootstrap';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const BBB_5 = ['Sawyer', 'Kalim', 'Brody', 'Caleb', 'Wesley', 'John', 'Jaxson', 'Travis', 'Killian', 'Danny', 'Adrian', 'Chris', 'Henry', 'Noah'];
const BBB_3 = ['Hudson', 'Logan', 'Kamden', 'Micheal', 'Noah', 'August', 'Odin', 'Axel', 'Lennox', 'Keetan', 'Tucker', '', '', ''];

function App() {
  const {
    totalSeconds,
    seconds,
    minutes,
    isRunning,
    start,
    pause,
    reset,
  } = useStopwatch({autoStart: false});
  const [confirmReset, setConfirmReset] = useState(false);
  const [players, setPlayers] = useState(shuffle(BBB_5).map(name => ({name, points: 0, seconds: 0, isIn: false, comingOut: false, goingIn: false, inAt: undefined, outAt: undefined})));

  // sort players in the game by those coming out and then by time in the game
  const playersInGame = players.filter(player => player.isIn)
        .sort((a, b) => {
            if (a.comingOut && !b.comingOut) {
                return -1;
            }
            if (!a.comingOut && b.comingOut) {
                return 1;
            }
            return (a.inAt || 0) - (b.inAt || 0);
        });

  const playersGoingIn = players.filter(player => player.goingIn);

  // sort players on bench length of time they have been on the bench
    const playersOnBench = players.filter(player => !player.isIn && !player.goingIn)
        .sort((a, b) => (a.outAt || 0) - (b.outAt || 0));

    useEffect(() => {
        if (isRunning) {
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
    }, [isRunning]);

    const resetAll = useCallback(() => {
        setPlayers(shuffle(BBB_5).map(name => ({name, points: 0, seconds: 0, isIn: false, comingOut: false, goingIn: false, inAt: undefined, outAt: undefined})));
        reset(undefined, false);
        setConfirmReset(false);
    }, [reset]);

    const toggleConfirmReset = useCallback(() => {
        setConfirmReset(current => !current);
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

  const addPoints = useCallback((selected, change) => {
    setPlayers(current => current.map(player => {
        if (player.name === selected) {
            return {...player, points: player.points + change};
        }
        return player;
    }));
  }, []);

  return (
      <div className="App">
        <div className="header">
          <div className="game-seconds-counter">
            <span>{String(minutes).padStart(2, '0')}</span>:<span>{String(seconds).padStart(2, '0')}</span>
          </div>
          {!isRunning && <Button variant="success" onClick={start}>Start</Button>}
          {isRunning && <Button variant="danger" onClick={pause}>Stop</Button>}
            <Button variant="primary" style={{marginLeft: 50}} onClick={substitute}>SUBS</Button>
            {!confirmReset && <Button variant="secondary" style={{marginLeft: 50}} onClick={toggleConfirmReset}>Reset</Button>}
            {confirmReset && <Button variant="secondary" style={{marginLeft: 50}} onClick={toggleConfirmReset}>Cancel Reset</Button>}
            {confirmReset && <div>Are you sure you want to reset all info?</div>}
            {confirmReset && <Button variant="danger" style={{marginLeft: 50}} onClick={resetAll}>YES</Button>}
        </div>
        <Row>
            <Col>
                <div className="col-title">IN</div>
                <div className="col-content">
                    {playersInGame.map(player => <PlayerCard key={player.name} onClick={comingOut} totalSeconds={totalSeconds} addPoints={addPoints} {...player} />)}
                </div>
            </Col>
            <Col>
                <div className="col-title">SUBS</div>
                <div className="col-content">
                    {playersGoingIn.map(player => <PlayerCard key={player.name} onClick={notGoingIn} {...player} />)}
                </div>
            </Col>
            <Col>
                <div className="col-title">OUT</div>
                <div className="col-content">
                    {playersOnBench.map(player => <PlayerCard key={player.name} onClick={goingIn} {...player} />)}
                </div>
            </Col>
        </Row>
      </div>
  );
}

const PlayerCard = ({name, points, seconds, isIn, comingOut, goingIn, inAt, totalSeconds, onClick, addPoints}) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const diffM = Math.floor((totalSeconds - inAt) / 60);
    const diffS = (totalSeconds - inAt) % 60;
    const classNames = ['player-card', 'alert'];
    if (isIn && !comingOut) classNames.push('alert-success');
    if (isIn && comingOut) classNames.push('alert-primary');
    if (goingIn) classNames.push('alert-primary');
    if (!isIn && !goingIn) classNames.push('alert-light');

    const addPoint = useCallback(() => {
        addPoints(name, 1);
    }, [addPoints, name]);
    const removePoint = useCallback(() => {
        addPoints(name, -1);
    }, [addPoints, name]);

    return (
        <Row className={classNames.join(' ')} data-name={name} onClick={onClick}>
            <Col xs={5}>
                <div>{name}</div>
            </Col>
            <Col xs={7}>
                {isIn && <span className='player-seconds-current'>({diffM}m {diffS}s)</span>}
                <span className='player-seconds'>{m}m {s}s</span>
            </Col>
            <div>
                {(isIn || points > 0) && <Badge bg="secondary">{points} pts</Badge>}
                {isIn && <Badge pill bg="secondary" onClick={addPoint}> + </Badge>}
                {isIn && <Badge pill bg="secondary" onClick={removePoint}> - </Badge>}
            </div>
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
