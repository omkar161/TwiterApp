const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
module.exports = app;

const filePath = path.join(__dirname, "twitterClone.db");
let db = null;
app.use(express.json());

const convertingIntoCamelcases = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

const initializerDbAndServer = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`Error : ${e.message}`);
    process.exit(1);
  }
};
initializerDbAndServer();

//register API 1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const getUserQuery = `
        SELECT * 
        FROM user 
        WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length <= 6) {
      response.send("Password is too short");
    } else {
      const addUserQuery = `
        INSERT INTO 
            user(username, password, name, gender)
        VALUES (
            '${username}',
            '${hashedPassword}',
            '${name}',
            '${gender}'
            )`;
      await db.run(addUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

//post API 2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
        SELECT *
        FROM user
        WHERE username='${username}';`;
  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "pallavi");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "pallavi", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//get API 3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { username } = request;
  const userId = `
  SELECT user_id FROM user WHERE username = '${username}';`;
  dbUser = await db.get(userId);

  const getTheQuery = `
        SELECT 
            user.username, tweet.tweet, tweet.date_time AS dateTime
        FROM 
            follower INNER JOIN tweet ON 
            follower.following_user_id = tweet.user_id 
            INNER JOIN user ON
            tweet.user_id = user.user_id
        WHERE
            follower.follower_user_id = ${dbUser.user_id}
        ORDER BY 
            tweet.date_time DESC
            LIMIT 4 `;
  const userArray = await db.all(getTheQuery);
  response.send(userArray);
});

//get API 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const { username } = request;
  const userId = `
  SELECT user_id FROM user WHERE username = '${username}';`;
  dbUser = await db.get(userId);
  //   console.log(dbUser.user_id);

  const getUserQuery = `
        SELECT user.name
        FROM user INNER JOIN follower ON
            user.user_id = follower.following_user_id
        WHERE 
            follower.follower_user_id = ${dbUser.user_id}`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

//get API 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { username } = request;
  const userId = `
  SELECT user_id FROM user WHERE username = '${username}';`;
  dbUser = await db.get(userId);

  const getUserQuery = `
        SELECT user.name
        FROM user INNER JOIN follower ON 
              user.user_id =follower.follower_user_id
        WHERE follower.following_user_id = ${dbUser.user_id}`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

//get API 6
app.get("/tweets/:tweetId/", authenticateToken, async (req, res) => { 
   const username = req.username; 
   const { tweetId } = req.params; 

   const getTweetQuery = SELECT 
             UF.tweet AS tweet, 
             (SELECT DISTINCT COUNT() FROM like WHERE tweet_id = "${tweetId}") AS likes, 
             (SELECT DISTINCT COUNT() FROM reply WHERE tweet_id = "${tweetId}") AS replies, 
             tweet.date_time AS dateTime 
         FROM 
             (follower INNER JOIN 
             tweet ON follower.following_user_id = tweet.user_id) AS UF 
         WHERE 
              UF.follower_user_id =  
              (SELECT 
                     user_id 
              FROM 
                     user 
              WHERE 
                      username = "${username}") 
              AND 
                 UF.tweet_id = "${tweetId}";; 
   const tweetDetails = await db.get(getTweetQuery); 

   if (tweetDetails === undefined) { 
     res.status(401); 
     res.send("Invalid Request"); 
   } else { 
     res.send(tweetDetails); 
   } 
 });

//get API 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {});
