const path = require("path")
const serveStatic = require("serve-static")
const fs = require("fs")

const dataRoot = path.resolve(__dirname, "..", "..", "..", "data")

module.exports = function(app) {
    app.use("/data/", (req, res) => {
        const filePath = path.join(dataRoot, req.url)
        if(req.method === "GET") {
            if(fs.existsSync(filePath)) {
                res.sendFile(filePath)
            } else {
                res.status(404).end()
            }
            
        }
    })
}

// module.exports = function(app) {
//     console.log("SHIT", serveStatic)
// }