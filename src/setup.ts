import 'dotenv/config';
const exec = require('child_process').exec;

//.envにある環境変数をnow-secretsに移してデプロイ
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
exec(`now secret add sfc-url ${sfsAddr}`, async (err, stdout, stderr) => {});
exec(`now secret add u_login ${signIn_Info.u_login} && now secret add u_pass ${signIn_Info.u_pass}`, async (err, stdout, stderr) => {});
exec(`now secret add line-token ${config.channelAccessToken} && now secret add line-secret ${config.channelSecret}`, async (err, stdout, stderr) => {});
exec(`now --public -e CHANNEL_ACCESS_TOKEN=@line-token -e CHANNEL_SECRET=@line-secret -e SFS_USER=@u_login -e SFS_PASS=@u_pass -e SFS_URL=@sfc-url`, async (err, stdout, stderr) => {
    console.log(stdout);
    if (err) {console.log(err)}
});

