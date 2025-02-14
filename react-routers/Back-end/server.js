const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()

app.use(cookieParser())

app.use(
    cors({
        origin : ["http://localhost:3000"],
        credential : true,
    })
)

app.use(express.json({limit: "10kb"}))

const PORT = process.env.PORT || 3000;

const connectToDB = require('./database/db');

connectToDB();

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
