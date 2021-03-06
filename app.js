const rp = require("request-promise")
const fs = require("fs")
const cheerio = require("cheerio")

class Download {
  constructor(url){
    this.curPage = 1
    this.main(url)
  }
  async main(url){
    const pageTotal = await this.getPageTotal(url)
    console.log(`成功获取到 ${pageTotal} 个页面，开始分页获取~`)
    for (let j=1; j<=pageTotal; j++) {
      const pageList = await this.getPageData(url, j)
      for (let i=0; i<pageList.length; i++) {
        const $ = await this.getPage(pageList[i].url)
        console.log(`开始下载第 ${j} 页，第${i + 1} 组的图片，共 ${$('.pagenavi a').eq(-2).find('span').html()} 张......`)
        await this.mkdirFolder($, pageList[i], i)
      }
    }
  }
  async getPage(url) {
    const data = await rp({
        url,
        transform: function (body) {
          return cheerio.load(body);
        }
      }).catch(err => console.log('$err:', err))
    return data
  }
  async getPageTotal(url){
    const $ = await this.getPage(url)
    const pageTotal = $('.nav-links a').eq(-2).html()
    return pageTotal
  }
  async getPageData(url, curPage){
    const pageList = []
    const $ = await this.getPage(url + 'page/' + curPage)
    $('#pins li img').each(function(){
      pageList.push({
        name: $(this).attr('alt'),
        url: $(this).parent().attr('href'),
      })
    })
    return pageList
  }
  async mkdirFolder($, pageList, i){
    const perPageUrl = []
    for (let i=1; i<=$('.pagenavi a').eq(-2).find('span').html(); i++) {
      perPageUrl.push(pageList.url + '/' + i)
    }
    const folderName = __dirname + '/' + pageList.name
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName)
      console.log(`${pageList.name} 文件夹创建成功，开始写入图片~`);
      await this.touchFile(perPageUrl, pageList.name)
    } else {
      console.log(`${pageList.name} 文件夹已经存在，暂不写入图片~`);
    }
  }
  async touchFile(perPageUrl, name){
    for (let i=0; i<perPageUrl.length; i++) {
      const $ = await this.getPage(perPageUrl[i])
      const imgSrc = $('.main-image img').attr('src')
      const pageTotal = $('.pagenavi a').eq(-2).find('span').html()
      let headers = {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Host: "i.meizitu.net",
        Pragma: "no-cache",
        "Proxy-Connection": "keep-alive",
        Referer: perPageUrl[i],
        "Upgrade-Insecure-Requests": 1,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.19 Safari/537.36"
      }; // 反防盗链
      await rp({
        url: imgSrc,
        resolveWithFullResponse: true,
        headers
      }).pipe(fs.createWriteStream(`${__dirname}/${name}/${i+1}.jpg`)); // 下载
      console.log(`正在下载 ${name} 图组 ${i+1}/${pageTotal}`)
    }
  }
}
let start = new Download('https://www.mzitu.com/')
