import express from 'express';

import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'; 

const app = express();
const port = process.env.PORT || 4005;



// importing model,schema and mongoDB file
import User from './models/User.js';
import Post from './models/Post.js';
import mongoDB from './db.js';
mongoDB();


// Middleware to parse JSON bodies
app.use(express.json());  //make req.body int json object accsible(check on postman)
app.use(express.urlencoded({extended:true})); // for encoded req.body (cookies)
app.use(express.static('public')); //dont put slash before public
app.use(cookieParser());// Use cookie-parser middleware


app.set('view engine' , 'ejs');


app.get('/', async (req, res) => {
    if(!req.cookies.token){
        // console.log("Not logged in");
        res.render("index", {loggedin:false});
    }else{
        // console.log(req.cookies.token);

        let data = jwt.verify(req.cookies.token, "shhh"); //decrypting data from jwt stored as cookie
        // console.log(data);
        let user = await User.findOne({email:data.email}); //use this data(i.e. email) to get username from database
        // console.log(user.username);
        res.render("index", {loggedin:true, username:user.username});
    }
    
    
});


app.get('/create', (req, res) => {
    res.render("Register");
});

app.post('/create',  async (req, res) => {
    let {username,name,age,email,password} = req.body;

    //Check if user already registered
    let user = await User.findOne({email:req.body.email});
    if(user) return res.status(500).send("User already exist!");
    

    bcrypt.genSalt(10, function(err, salt) {
        // console.log(`salt: ${salt}`);
        bcrypt.hash( password, salt, async function(err, hash) { //async is applied to parent function of await always.
            const newuser = await User.create({
                username:username,
                name:name,
                age:age,
                email:email,
                password:hash, //password is now hash.
                
            });

            //We can make user login immediately
            let token = jwt.sign({email:email, userid: newuser._id}, "shhh");
            res.cookie("token",token);

            res.redirect("/");
        });
    });

    
});


//login handling
app.get('/login', (req, res) => {
    res.render("Login");
});
app.post('/login', async (req, res) => {
    //We can make user login immediately
    let user = await User.findOne({email:req.body.email});
    if(!user){
        return res.status(500).send("Something went Wrong here"); //No such email exist
    }else{
        let storedPassword = user.password;
        let givenPassword = req.body.password;

        bcrypt.compare(givenPassword, storedPassword, function(err, result) {
            if(result){
                let token = jwt.sign({email:req.body.email, userid: user._id}, "shhh");
                res.cookie("token",token);
                res.redirect("/");
            }else{
                res.send("Something went Wrong thre") // Password is wrong
            }
        });
        
    }
});


//logout handling
app.get('/logout', (req, res) => {
    res.cookie("token","");
    res.redirect("/");
});



app.get('/profile', isLoggedIn, async (req, res) => {  // using the protected route (middleware) that is defined below
    // console.log(`User is : ${JSON.stringify(req.user)}`);  //need to stringify instead result will be -> User is : [object Object]
    let our_user = await User.findOne({email:req.user.email}).populate('posts'); //remember we are using req.user.email that we have passed throught middlewear isLoggedIn
    // console.log(req.user.email);
    // console.log(our_user);
    res.render("Profile", {user:our_user});
});

app.post('/post', isLoggedIn, async (req, res) => {  // using the protected route (middleware) that is defined below
     
    const em = req.user.email; //remember we are using req.user.email that we have passed throught middlewear isLoggedIn
    let thisuser = await User.findOne({email:em});
    
    const newpost = await Post.create({
        user:thisuser._id,
        content:req.body.content,
    });

    console.log(newpost);

    thisuser.posts.push(newpost._id); //adding this to the current users post array
    await thisuser.save();
    res.redirect('/profile');
});

app.get('/like/:id', isLoggedIn, async (req, res) => {  // using the protected route (middleware) that is defined below
     let postid = req.params.id;
     let this_users_id = req.user.userid;
     let thispost = await Post.findOne({_id:postid});
     
     if(thispost.likes.indexOf(this_users_id)==-1){
        //like
        thispost.likes.push(this_users_id);

     }else{
        //deslike
        let index = thispost.likes.indexOf(this_users_id);
        thispost.likes.splice(index);

     }

     await thispost.save();
     res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {  // using the protected route (middleware) that is defined below
    let postid = req.params.id;
    let this_users_id = req.user.userid;
    let thispost = await Post.findOne({_id:postid});
    
      

    // await thispost.save();
    res. render('edit', {thispost});
});

app.post('/edit/:id', isLoggedIn, async (req, res) => {  // using the protected route (middleware) that is defined below
    let postid = req.params.id;
    await Post.findOneAndUpdate({_id:postid},{content:req.body.content});
          

    // await thispost.save();
    res.redirect('/profile');
});

//Creating protected route

function isLoggedIn(req,res,next){
    if(!req.cookies.token){
        return res.status(401).send("You must be logged in!")
    }else{
        let data = jwt.verify(req.cookies.token, "shhh"); //decrypting data from jwt stored as cookie
        req.user = data;
    }
    next();
}



//::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::;;

app.listen(port,()=>{
    console.log(`Server started at http://localhost:${port}`)
})
