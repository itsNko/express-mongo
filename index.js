const express = require('express');

const path = require('path')

const mongojs = require('mongojs')
const db = mongojs('mongodb://127.0.0.1:27017/test', ['inventory'])

const app = express();
const port = 3000;

// enable json body parsing
app.use(express.json());

// enable post body parsing
app.use(express.urlencoded({extended: true}));

//enable images
app.use(express.static(__dirname+'/public'));
var router = express.Router();
const multer = require('multer')
const {unlink} = require('fs')
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './public/img/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

var upload = multer({ //multer settings
    storage: storage,
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
            return callback(new Error("Only images can be uploaded."))
        }
        callback(null, true)
    },
    limits:{
        fileSize: 1024 * 1024
    }
});

// use templates
app.set('view engine', 'ejs');
app.set('views', './views');

let remove = function(res, id){
    db.inventory.remove({_id: mongojs.ObjectId(id)}, (err, result) => {
        if (err) {
            res.send(err);
        } else {
            res.redirect('/inventory')
        }
    });
}
app.delete('/inventory/:id', (req, res) => {
    remove(res, req.params.id)
});

app.get('/inventory/delete/:id', (req, res) => {
    remove(res, req.params.id)
})

app.post('/inventory', (req, res) => {
    // insert the document
    db.inventory.insert(req.body, (err, result) => {
        if (err) {
            res.send(err)
        } else {
            res.send(result)
        }
    })
})

app.get('/inventory', (req, res) => {
    db.inventory.find((err, docs) => {
        if (err) {
            res.send(err);
        } else {
            docs.map(elm => {
                if(elm.img == null)
                    elm.img = 'no_img.jpg'
            })
            res.render('inventory', {elements: docs})
        }
    })
})

app.get('/edit/:id', (req, res) => {
    db.inventory.findOne({_id: mongojs.ObjectId(req.params.id)}, (err, doc) => {
        if (err) {
            res.send(err);
        } else {
            console.log(doc)
            res.render('edit', {element: doc})
        }
    })
})

app.post('/edit/:id', upload.single('avatar'),(req, res) => {
    console.log(req.file)
    var img = null
    if(req.file != null)
        req.body.img = req.file.filename

    req.body.size = JSON.parse(req.body.size)
    console.log(req.body)
    console.log(req.params.id)

    db.inventory.findAndModify({
            query: {_id: mongojs.ObjectId(req.params.id)},
            update: {$set: req.body}
        },
        (err, result) => {
            if (err) {
                if(req.file != null)
                    unlink(__dirname + req.file.path, err => (console.log("Cannot delete file.")))
                res.send(err)
            } else {
                res.redirect('/inventory')
            }
        })
})

app.get('/create', (req, res) => {
    res.render('create')
})

app.post('/create',  upload.single('avatar'), (req, res, next) => {
    console.log(req.file)
    var img = null
    if(req.file != null)
        img = req.file.filename

    db.inventory.insert(
        {
            "item": req.body.item,
            "qty": parseInt(req.body.qty),
            "size": JSON.parse(req.body.size),
            "status": req.body.status,
            "img": img
        },
        (err, result) => {
            if (err) {
                if(req.file != null)
                    unlink(__dirname + req.file.path, err => (console.log("Cannot delete file.")))
                res.send(err);
            } else {
                res.redirect('/inventory')
            }
    });
})

module.exports = router;

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
