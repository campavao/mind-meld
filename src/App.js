import { useEffect, useMemo, useState } from 'react';
import io from 'socket.io-client';
import { v4 as uuid } from 'uuid';

import { Button, Form, Card, ListGroup } from 'react-bootstrap';

import './App.scss';

const socket = io();

const userId = uuid();

function App() {
  const [currentGame, setCurrentGame] = useState();
  const [errorMsg, setErrorMsg] = useState();
  const [userTyping, setUserTyping] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      socket.emit('setUserId', userId)
    });

    return () => {
      socket.off('connect');
    };
  }, []);

  useEffect(() => {
    socket.on('currentGame', (game) => {
      setCurrentGame({
        ...currentGame,
        ...game
      });

      if (gameWon) {
        setGameWon(false);
      }
    })

    return () => {
      socket.off('currentGame');
    };
  }, [currentGame, gameWon]);

  useEffect(() => {
    socket.on('error', (error) => {
      console.warn(error)
      setErrorMsg(error)
    })

    return () => {
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    if (currentGame) {
      const userWords = [...currentGame.users].map(user => user.words.length);
      userWords.sort((a, b) => b - a);
      const everyWordIsIn = userWords.every(val => val === userWords[0]);
      setUserTyping(!everyWordIsIn ? userWords[0] : false);
      if (everyWordIsIn && !userWords.every(val => val === 0)) {
        const everyFinalWord = currentGame.users.map(user => user.words[user.words.length - 1]);
        const sameEveryWord = everyFinalWord.every(val => val === everyFinalWord[0]);
        setGameWon(sameEveryWord);
      }
    }
  }, [currentGame])

  const createGame = (e) => {
    e.preventDefault();
    const gameId = uuid();
    socket.emit('create', gameId, {
      id: userId,
      name: e.target.form.name.value,
      words: []
    });
  }

  const joinGame = (e) => {
    e.preventDefault();
    const gameId = e.target.form.code.value;
    console.log('trying to join', gameId)
    socket.emit('game', gameId, {
      id: userId,
      name: e.target.form.name.value,
      words: []
    });
  }

  const sendWord = (e) => {
    e.preventDefault();
    const allWords = currentUser.words;
    const word = e.target.form.word.value;
    if (allWords.includes(word)) {
      setErrorMsg('Word already guessed. Guess a different word.');
    } else {
      socket.emit('word', { word, gameId: currentGame.id, userId });
      setErrorMsg(undefined);
    }
    e.target.form.word.value = '';
  }

  const reset = (e) => {
    e.preventDefault();
    socket.emit('reset', currentGame.id);
    setGameWon(false);
  }

  const currentUser = useMemo(() => currentGame?.users.find(user => user.id === userId) ?? {}, [currentGame])

  return (
    <div className='container'>
      <header>
        <h1>Mind Meld</h1>
        <p>Try to guess the same word!</p>
      </header>
      {gameWon && <h1>You won!</h1>}
      {errorMsg && <div className='error'>{errorMsg}</div>}
      {!currentGame ? (

        <Intro createGame={createGame} joinGame={joinGame} />
      ) : (
          <div>
            <div>current game: {currentGame.id}</div>
            <div className="users">{currentGame.users.map(user => {
              return (
                <Card key={user.id} className="user">
                  <Card.Header>{user.name}</Card.Header>
                  <ListGroup variant="flush">
                    {user.words.map((word, index) => {
                      const listItem = index === userTyping - 1 ? '✔' : word;
                      return  <ListGroup.Item className='word'>{listItem}</ListGroup.Item>
                    })}
                  </ListGroup>
                </Card>
              );
            })}
            </div>
            {!gameWon ? <Form>
              <Form.Group className="mb-3" controlId="word">
                <Form.Label>Word:</Form.Label>
                <Form.Control as="input" rows={3} />
                <Button onClick={sendWord} disabled={gameWon || (currentUser.words.length > 0 && currentUser.words.length === userTyping)}>Send</Button>
              </Form.Group>
            </Form> : <Button onClick={reset}>Reset</Button>}
          </div>
      )}
    </div>
  );
}

function Intro({ createGame, joinGame }) {
  return (
      <Form>
        <Form.Group className="mb-3" controlId="name">
          <Form.Label>Name:</Form.Label>
          <Form.Control as="input" rows={3} />
        </Form.Group>
        <Form.Group className="mb-3" controlId="code">
          <Form.Label>Code:</Form.Label>
          <Form.Control as="input" rows={3} />
        </Form.Group>
        <Form.Group controlId="create">
          <Button variant="primary" size="lg" onClick={joinGame}>Join game</Button>
          <Button variant="secondary" size="lg" onClick={createGame}>Create game</Button>
        </Form.Group>
      </Form>
  );
}

export default App;
