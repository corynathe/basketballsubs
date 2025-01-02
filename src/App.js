import React, {useCallback, useEffect, useState} from "react";
import { useStopwatch } from 'react-timer-hook';
import { Button, Row, Col } from 'react-bootstrap';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const PLAYER_NAMES = ['Sawyer', 'Carter', 'Eli', 'Evan', 'Jack', 'Jude', 'Luke', 'Mason', 'Noah', 'Owen', 'Wyatt'];

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
  const [players, setPlayers] = useState(PLAYER_NAMES.map(name => ({name, seconds: 0, isIn: false, comingOut: false, goingIn: false, inAt: undefined, outAt: undefined})));

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
        setPlayers(PLAYER_NAMES.map(name => ({name, seconds: 0, isIn: false, comingOut: false, goingIn: false, inAt: undefined, outAt: undefined})));
        reset(undefined, false);
        setConfirmReset(false);
    }, [reset]);

    const toggleConfirmReset = useCallback(() => {
        setConfirmReset(current => !current);
    }, []);

  const goingIn = useCallback((evt) => {
      const selected = evt.target.getAttribute('data-name');
      setPlayers(current => current.map(player => {
            if (player.name === selected) {
                return {...player, goingIn: true};
            }
            return player;
      }));
  }, []);

  const notGoingIn = useCallback((evt) => {
        const selected = evt.target.getAttribute('data-name');
        setPlayers(current => current.map(player => {
                if (player.name === selected) {
                    return {...player, goingIn: false};
                }
                return player;
        }));
  }, []);

  const comingOut = useCallback((evt) => {
        const selected = evt.target.getAttribute('data-name');
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
                <div className="col-title">IN GAME</div>
                <div className="col-content">
                    {playersInGame.map(player => <PlayerCard key={player.name} onClick={comingOut} totalSeconds={totalSeconds} {...player} />)}
                </div>
            </Col>
            <Col>
                <div className="col-title">NEXT SUBS</div>
                <div className="col-content">
                    {playersGoingIn.map(player => <PlayerCard key={player.name} onClick={notGoingIn} {...player} />)}
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
                {name}
            </Col>
            <Col xs={7}>
                {isIn && <span className='player-seconds-current'>({diffM}m {diffS}s)</span>}
                <span className='player-seconds'>{m}m {s}s</span>
            </Col>
        </Row>
    );
}

export default App;
