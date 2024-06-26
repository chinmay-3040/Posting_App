import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/user_post_database';



const mongoDB = async () => {
    try {
      await mongoose.connect(uri);
      console.log('Connected 7');
        
    } catch (error) {
      console.log('err: ', error);
    }
  };


export default mongoDB;