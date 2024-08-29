const express = require('express');
const cors=require('cors')
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

const projectRoutes=require('./routes/projects')
const componentRoutes=require('./routes/component')
const subComponentRoutes=require('./routes/subcomponents')

const app = express();

app.use(express.json());
app.use(cors())
mongoose.connect('mongodb+srv://contentmanagementsystem577:cms123@cms.9holq.mongodb.net/?retryWrites=true&w=majority&appName=cms', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connected');
    // Initialize GridFSBucket
    app.locals.bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
})
.catch(err => console.log(err));


// Use Routes
 
app.use('/api/projects',projectRoutes)
app.use('/api/component',componentRoutes)
app.use('/api/subComponent',subComponentRoutes)
app.listen(5003, () => {
    console.log('Server is running on port 5000');
});
