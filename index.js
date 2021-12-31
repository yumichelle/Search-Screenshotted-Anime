/**
 * NOTE: the places of the following environment variables used and thus are not JSON stored:
 * LINE 142:  const client_id = process.env.anilist_client_id
 * LINE 156: "client_secret": process.env.anilist_client_secret
*/

const http = require('http')
const https = require('https')
const fs = require('fs')
const url = require('url')
const server = http.createServer(requestListener)

server.listen(3000, '127.0.0.1')
server.on('listening', () => { console.log(`Now Listening on Port 3000`) })

let APIarr = [] // to test the two API's are synchronous.
let tmResults = null

function requestListener(request, response) {
  if (request.url === '/') {
    response.writeHead(200, { "Content-Type": "text/html" })
    const form = fs.createReadStream('index.html')
    form.pipe(response)
  } else if (url.parse(request.url, true).pathname === '/enterForm') {
    let query = url.parse(request.url, true).query // [Object: null prototype] { imageURL: '' }
    response.writeHead(200, { "Content-Type": "text/html" })
    tracemoeSearch(query, response)

  } else if (url.parse(request.url, true).pathname === '/redirectCB') {
    response.writeHead(200, { "Content-Type": "text/html" })
    const code = url.parse(request.url, true).query
    const tokenCacheFile = './authentication-res.json'
    let cacheValid = false
    if (fs.existsSync(tokenCacheFile)) {
      cachedTokenObj = require(tokenCacheFile)
      console.log('31', cachedTokenObj)
      if (new Date(cachedTokenObj.expiration) > Date.now()) {
        cacheValid = true
      }
    }
    if (cacheValid) {
      let access_token = cachedTokenObj.access_token
      console.log('38 cache exists and is valid')
      makeAuthenticatedRequests(access_token, response)
    }
    else {
      console.log('42 cache does not exist is not valid')
      getAccessTokens(code, response)
    }

  } else {
    console.log(request.url, request.url.pathname)
    response.writeHead(404, { "Content-Type": "text/html" })
    response.end(`<h1>404 Not Found</h1>`)
  }
}

function results(animeinfo, requestListenerResponse, is_infile) {
  // chunks = {"data":{...}}
  let data = null
  if (is_infile === 'infile') {
    console.log('57 infile', animeinfo.data.Media.title.english) // if anime is in file
    data = animeinfo
    requestListenerResponse.write(`<h1>${data.data.Media.title.romaji !== null ? data.data.Media.title.romaji : data.data.Media.title.english} previously added!</h1>`)
  }
  if (is_infile === 'notinfile') {
    data = JSON.parse(animeinfo)
    console.log('63 notinfile', data.data.Media.title.english)
    requestListenerResponse.write(`<h1>${data.data.Media.title.romaji !== null ? data.data.Media.title.romaji : data.data.Media.title.english} added!</h1>`)
  }
  let eng_title = JSON.stringify(data.data.Media.title.english)
  let rom_title = JSON.stringify(data.data.Media.title.romaji)
  let siteUrl = JSON.stringify(data.data.Media.siteUrl)
  let averageScore = JSON.stringify(data.data.Media.averageScore)
  let description = JSON.stringify(data.data.Media.description)
  let image = JSON.stringify(data.data.Media.coverImage.large)
  let episodes = JSON.stringify(data.data.Media.episodes)
  let status = JSON.stringify(data.data.Media.status)

  // trace.moe results
  requestListenerResponse.write(`
        Image you submitted: <br>
        <image src = ${tmResults.imageURL} style="max-width:50%"> <br>
        vs What we think it is: <br>
        <img src = ${tmResults.image}>
        <video width="320" height="200" controls>
          <source src=${tmResults.video} type="video/mp4">
        </video> <br>
        It had a ${(tmResults.similarity) * 100} similarity to this anime: <br>
      `)

  // anilist results
  requestListenerResponse.write(`
        <h3><a href = ${siteUrl}>${eng_title !== null ? rom_title : eng_title}</a></h3> <br>
        <img src= ${image}> <br>
        Average Score: ${averageScore} <br>
        Episodes: ${episodes} <br>
        Status: ${status} <br>
        ${description.toString(encoding = 'utf8')}
      `)

  requestListenerResponse.end()

}


/******** trace.moe FUNCTIONS & VARIABLES *********/
function tracemoeSearch(query, requestListenerResponse) {
  APIarr.push('trace.moe')
  if (query.imageURL != undefined) { // URL is used

    // Make the HTTPS API request
    const tmRequest = https.get(`https://api.trace.moe/search?url=${query.imageURL}`, (res) => {
      let chunks = ''
      res.on('data', (chunk) => { chunks += chunk })
      res.on('end', () => {

        let result = JSON.parse(chunks)
        let firstResult = undefined
        if (result.result.length > 0) firstResult = result.result[0] // if result.result is an array
        else firstResult = result.result
        tmResults = {
          imageURL: query.imageURL,
          image: firstResult.image,
          video: firstResult.video,
          anilist: firstResult.anilist,
          similarity: firstResult.similarity
        }
        redirectingForAuthorization(requestListenerResponse)
      })
    })
    tmRequest.on('error', (err) => console.error(err))
    tmRequest.end()
  }
}



/******** ANILIST FUNCTIONS & VARIABLES *********/
function redirectingForAuthorization(requestListenerResponse) {
  const client_id = process.env.anilist_client_id
  const redirect_uri = 'http://localhost:3000/redirectCB'
  const response_type = 'code'
  const data = new URLSearchParams({ client_id, redirect_uri, response_type })
  let authorization_endpoint = new URL(`https://anilist.co/api/v2/oauth/authorize?${data.toString()}`)

  requestListenerResponse.writeHead(302, { Location: authorization_endpoint }).end()
}

function getAccessTokens(code, requestListenerResponse) {
  const tokenEndpoint = 'https://anilist.co/api/v2/oauth/token'
  const postData = {
    "grant_type": "authorization_code",
    "client_id": process.env.anilist_client_id,
    "client_secret": process.env.anilist_client_secret,
    "redirect_uri": "http://localhost:3000/redirectCB",
    "code": code.code
  }
  let options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }

  const req = https.request(tokenEndpoint, options, (res) => {
    let chunks = ''
    res.on('data', (chunk) => { chunks += chunk })
    res.on('end', () => { receivedAccessToken(chunks, requestListenerResponse) })
  }
  )
  req.end(JSON.stringify(postData))
}

function receivedAccessToken(chunks, requestListenerResponse) {
  const access_token = JSON.parse(chunks) // { token_type: 'Bearer', expires_in: , access_token: , refresh_token: } 
  const now = new Date()
  access_token.expiration = new Date(now.getTime() + (access_token.expires_in * 1000))
  fs.writeFile('./authentication-res.json', JSON.stringify(access_token), () => console.log('175 access token cached'))
  makeAuthenticatedRequests(access_token.access_token, requestListenerResponse)
}

function makeAuthenticatedRequests(access_token, requestListenerResponse) {
  // requestListenerResponse.end('144')
  // console.log('208', access_token) // access_token: 'eyJ0eXA...'
  let is_infile = true
  if (fs.existsSync('./anilist-res.json')) {
    fileObj = require('./anilist-res.json')
    let data = fileObj.map(elt => JSON.parse(elt))
    const found = data.find(element => element.data.Media.id === tmResults.anilist)
    if (found != undefined) results(found, requestListenerResponse, 'infile')
    else {
      is_infile = false
      console.log('190 file exists but anime is not in file')
    }
  }
  if (is_infile === false || !fs.existsSync('./anilist-res.json')) {
    console.log('194 file does not exists')
    anilistMutation(access_token, requestListenerResponse)
  }
}

function anilistMutation(access_token, requestListenerResponse) {
  if (APIarr.includes('trace.moe')) {
    console.log('201', APIarr)
    APIarr.push('AniList anilistMutation')
    const data = {
      "query": `
        mutation($id: Int, $status: MediaListStatus){ 
          SaveMediaListEntry(mediaId: $id, status: $status)
          {id, status}
        
        }
      `,
      "variables": { "id": tmResults.anilist, "status": "PLANNING" }
    }

    let options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    }

    // Make the HTTP API request
    https.request('https://graphql.anilist.co', options, (res) => {
      let chunks = ''
      res.on('data', (chunk) => { chunks += chunk })
      res.on('end', () => {
        console.log('228', chunks) /* if valid token: { data: { SaveMediaListEntry: { id: , status: 'PLANNING' } } }
                                      else: {"errors":[{"message":"Invalid token","status":400,"locations":[{"line":3,"column":11}]}] */

        getAnimeInfo(tmResults.anilist, requestListenerResponse)
      })
    }).end(JSON.stringify(data)).on('error', (err) => console.error(err))

  }

}

function getAnimeInfo(id, requestListenerResponse) {
  APIarr.push('AniList getAnimeInfo')
  console.log('241', APIarr)

  const query = {
    "query": `
      query ($id: Int) {
        Media(type:ANIME, id: $id){
          id,
          title {
            romaji
            english
            native
            userPreferred
          },
          averageScore,
          description,
          episodes,
          status,
          bannerImage,
          coverImage {
            extraLarge
            large
            medium
            color
          },
          siteUrl
        }
      }  
    `,
    "variables": { "id": id }
  }

  let infoOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  }

  // Make the HTTPS API request
  https.request('https://graphql.anilist.co', infoOptions, (res) => {
    let chunks = ''
    res.on('data', (chunk) => { chunks += chunk })
    res.on('end', () => {
      results(chunks, requestListenerResponse, 'notinfile')

      let fileObj = []
      if (fs.existsSync('./anilist-res.json')) {
        fileObj = require('./anilist-res.json')
        fileObj.push(chunks)
        fs.writeFileSync('./anilist-res.json', JSON.stringify(fileObj), () => console.log('291 results cached'))
      }
      else {
        fileObj.push(chunks)
        fs.writeFileSync('./anilist-res.json', JSON.stringify(fileObj), () => console.log('295 results cached'))
      }
    })
  }).end(JSON.stringify(query)).on('error', (err) => console.error(err))

}