import "./src/main.js";

import * as cluster from "cluster";

const developEnv = process.env?.NODE_ENV == "development";
// import * as io from '@pm2/io';

let requests = [];

let packSelect = {};
let packUsage = {};

import axiosDebugLog from "axios-debug-log";

axiosDebugLog({
  request: (debug, config) => {
    const requestURL = config.baseURL ? config.baseURL + config.url : config.url;
    if (developEnv) {
      console.log(`Sent request to ${requestURL} on ${cluster.isWorker ? "worker" + cluster.worker.id : "master"}.`);
    }
    if (requestURL.startsWith("https://api.hypixel.net/") && config?.params?.key) {
      if (cluster.isPrimary) {
        requests.push(getTime());
      } else {
        process.send({ type: "hypixel_request", time: getTime() });
      }
    }
  },
});

function getTime() {
  return `${Math.floor(Math.random() * 10000 + 1000)
    .toString()
    .substring(0, 4)}/${+new Date()}`;
}

async function init() {
  setInterval(() => {
    requests = requests.filter((a) => a.substring(5) > +new Date() - 60 * 1000);
    // console.log(`Current API requests: ${requests.length} / min`);
  }, 1000);

  setInterval(() => {
    // todo: do some actual output for these stats

    packSelect = {};
    packUsage = {};
  }, 1000 * 60);
}

if (cluster.isPrimary) {
  // const apiRequests = io.metric({
  //   name: "API Requests",
  //   unit: "reqs/min",
  //   value: () => {
  //     return requests.length;
  //   },
  // });

  // console.log(apiRequests);

  const msgHandler = function (msg) {
    if (msg?.type == null) return;

    switch (msg.type) {
      case "hypixel_request":
        if (!msg.time) return;
        requests.push(msg.time);
        return;
      case "selected_pack":
        if (!msg.id) return;
        if (packSelect[msg.id] == null) packSelect[msg.id] = 1;
        else packSelect[msg.id]++;
        return;
      case "used_pack":
        if (!msg.id) return;
        if (packUsage[msg.id] == null) packUsage[msg.id] = 1;
        else packUsage[msg.id]++;
        return;
    }
  };

  for (const id in cluster.workers) {
    cluster.workers[id].on("message", msgHandler);
  }

  init();
}
