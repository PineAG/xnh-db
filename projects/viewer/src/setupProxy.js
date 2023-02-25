const path = require("path")
const serveStatic = require("serve-static")
const fs = require("fs")

const dataRoot = path.resolve(__dirname, "..", "..", "..", "data", "data")

module.exports = function(app) {
    app.use("/data/", (req, res) => {
        const filePath = path.join(dataRoot, req.url)
        if(req.method === "GET") {
            if(fs.existsSync(filePath)) {
                res.sendFile(filePath)
            } else {
                res.status(404).end()
            }
            
        }else if(req.method === "HEAD") {
            if(fs.existsSync(filePath)) {
                res.status(200).end()
            } else {
                res.status(404).end()
            }
        } else {
            res.status(405).end()
        }
    })
}

// module.exports = function(app) {
//     console.log("SHIT", serveStatic)
// }