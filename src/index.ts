import * as line from '@line/bot-sdk'
import * as express from 'express'
import * as cheerio from 'cheerio-httpcli';


//SFC-SFSのアドレス
const sfsAddr = process.env.SFS_URL || "https://vu.sfc.keio.ac.jp/sfc-sfs/";
//ログイン情報
const signIn_Info = {
    u_login: process.env.SFS_USER,
    u_pass: process.env.SFS_PASS
};

//LINEのアクセストークン
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};
//Nowでデプロイする際に注入する
/*
*$ now secret add line-token XXXX-XXXX-XXXX
$ now secret add line-secret YYYY-YYYY-YYYY
$ now secret add u_login XXXX
$ now secret add u_pass XXXX
$ now -e CHANNEL_ACCESS_TOKEN=@line-token -e CHANNEL_SECRET=@line-secret -e SFS_USER=@u_login -e SFS_PASS=@u_pass
*/

// create LINE SDK client
const client = new line.Client(config);
// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
app.post('/webhook', line.middleware(config), (req, res) => {
    console.log(req.body.events);
    Promise
        .all(req.body.events.map(handleWebhookEvent))
        .then((result) => res.json(result)).catch(e => {console.log(e)})
});

function handleWebhookEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null);
    }

    let returnMessage = "";

    if(event.message.text === '時間割'){
        returnMessage = 'かしこまり!'; //待ってねってメッセージだけ先に処理
        getCourse(event.source.userId); //スクレイピング処理が終わったらプッシュメッセージ
    }else{
        returnMessage = "'時間割'と入力すると時間割を取得してくるよ!";
    }

    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: returnMessage //実際に返信の言葉を入れる箇所
    });
}

//時間割取得
async function getCourse(userId) {
    const topPage = await cheerio.fetch(sfsAddr);
    topPage
        .$('form')
        .submit(signIn_Info)
        .then(async result => {
            console.log('succeeded Sign In!');
            //ログイン後のページへのリンクを切り出す(もっと良い方法があるはず)
            const specificIdStart = result.body.indexOf('id=');
            const specificIdEnd = result.body.indexOf('&type=s&mode=0');
            //無理矢理URLを切り出してる(もっと良い方法があるはず)
            const specificId = result.body.slice(specificIdStart, specificIdEnd);
            const timeTableLink = `https://vu.sfc.keio.ac.jp/sfc-sfs/sfs_class/student/view_timetable.cgi?${specificId}&type=s&mode=1&lang=ja`;
            //iframeの内容
            const timeTable = await cheerio.fetch(timeTableLink);
            //時間割のtableから授業へのリンクを抽出する
            const courseLinks = timeTable.$('table').find('a');
            // console.log(courseLinks);
            const courseLinkArray : Array<string> = [];
            const courseNameArray : Array<string> = [];

            courseLinks.each( async (index, element) => {
                const link = element.attribs.href;
                const name = element.firstChild.data;
                courseLinkArray.push(link);
                courseNameArray.push(name);
            });

            await client.pushMessage(userId, {
                type: 'text',
                text: `${courseNameArray}`
            });

        })
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});