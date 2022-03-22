import { finalizeRegistration } from "@xnh-db/register-utils"

import "./作者"
import "./声优"
import "./原神"
import "./战双"
import './番剧'


finalizeRegistration({
    outputDir: 'dist',
    sourceImageDir: 'tmpJS',
    imagePublicDir: 'images'
})
