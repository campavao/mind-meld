// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, deleteDoc, doc, updateDoc, getDoc, addDoc, collection, getDocs, collectionGroup, query, where } from "firebase/firestore";

// Your web app's Firebase configuration

// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: "mind-meld-7782c.firebaseapp.com",
    projectId: "mind-meld-7782c",
    storageBucket: "mind-meld-7782c.appspot.com",
    messagingSenderId: "258145163314",
    appId: "1:258145163314:web:28d906fbdc98e7b4f6042b",
    measurementId: "G-F5440D8W0H"

  };


// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);

export const createGame = async (gameId, userInfo) => {
  const newDocRef = await addDoc(collection(db, 'games'), {
    users: { [userInfo.id]: {...userInfo, isHost: true} },
    id: gameId,
  });

  return getDoc(newDocRef);
}
/** checks if the user is present already in game, if not returns new user */
const getUser = (users, userInfo) => Object.entries(users).find(([_, info]) => info.name === userInfo.name)?.[1] ?? userInfo;

export const joinGame = async (gameId, userInfo) => {
  const gameQuery = query(collectionGroup(db, 'games'), where('id', '==', gameId))
  const game = await getDocs(gameQuery);

  const firstDoc = game.docs[0];

  const { users } = firstDoc.data();

  const docRef = doc(db, 'games', firstDoc.id);

  const user = getUser(firstDoc.data().users, userInfo);

  if (users[user.id]) {
    delete users[user.id];
  }

  const updatedUsers = {
    ...users,
    [userInfo.id]: {
      ...user,
      id: userInfo.id
    }
  }

  await updateDoc(docRef, {
    users: updatedUsers
  })
  return getDoc(docRef);

}

export const addWordToUserList = async (userId, refId, word) => {
  const docRef = doc(db, 'games', refId);
  const foundGame = await getDoc(docRef);

  const { users } = foundGame.data();
  const currUser = {
      ...users[userId],
      words: [...users[userId].words, word]
  };

  await updateDoc(docRef, {
    users: { ...users, [userId]: currUser }
  })

return getDoc(docRef);

}

export const removePlayer = async (userId, refId) => {
  const docRef = doc(db, 'games', refId);
  const foundGame = await getDoc(docRef);

  const { users } = foundGame.data();
  const newUsers = users;

  delete newUsers[userId];

  await updateDoc(docRef, {
    users: newUsers
  })

  return getDoc(docRef);
}

export const removeRoom = async (refId) => {
  const docRef = doc(db, 'games', refId);
  await deleteDoc(docRef);
}

export const resetUserList = async (refId) => {
  const docRef = doc(db, 'games', refId);
  const foundGame = await getDoc(docRef);

  const { users } = foundGame.data();
  const newUsers = {};

  Object.entries(users)
    .forEach(([id, userInfo]) => (
      newUsers[id] = {
        ...userInfo,
        words: []
      }
    )
  );

  await updateDoc(docRef, {
      users: newUsers
  })

  return getDoc(docRef);
}
