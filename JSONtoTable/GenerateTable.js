// got this here: https://stackoverflow.com/questions/5180382/convert-json-data-to-a-html-table
// Builds the HTML Table out of myList.


const fs = require('fs')
const path = require('path')

const { JSDOM, VirtualConsole } = require('jsdom')


const data = require('./history.json')
const jQ = fs.readFileSync(path.join(__dirname, './jq.min.js'))
const JsonToTable = fs.readFileSync(path.join(__dirname, './jsonToTableJQ.js'))
const style = fs.readFileSync(path.join(__dirname, './table.css'))



function generateHTML() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console);
  const dom = new JSDOM(`<html>
  <head>
  <meta charset='utf-8'>
  <script>${jQ}</script>
  <script>${JsonToTable}</script></head>
  <script>function genTable() { processJson(${JSON.stringify(data)}) }</script>
  <style>${style}</style>
  <body>
  <input type="button" onclick='genTable()' id="btn" value="Generate Table"/>
  <div id="inner_tbl" border="1">
  </div>
  </body></html>`, { runScripts: "dangerously", virtualConsole })
  const window = dom.window
  window.eval(`document.getElementById("btn").click()`)
  window.document.querySelectorAll("script").forEach((k, v) => { k.remove() }) // remove script elements
  window.document.getElementById("btn").remove() // remove button element
  fs.writeFileSync(path.join(__dirname, 'table.html'), dom.serialize()) // save html file
  window.close()
}

generateHTML()