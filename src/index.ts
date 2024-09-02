import { WebSocket } from "ws";
import * as blessed from "blessed";
import { progressbar } from "blessed";

import { getRand } from "./utils/get-rand";

import { randomUUID } from "crypto";
import { Console } from "console";
const iterations = 200;
(async () => {
  // console.log("Starting real-time metrics application...");
  await new Promise((resolve) => setTimeout(resolve, 10)); // 2-second delay
  let scr = blessed.screen({
    smartCSR: true,
    title: "Real-time Metrics",
  });
  let screen1 = blessed.box({ bg: "#AAAAAA", width: "100%", height: "100%" });
  scr.append(screen1);
  scr.key(["q", "C-c"], (ch, key) => {
    scr.destroy();
    process.stdout.write(JSON.stringify(metrics, undefined, 2));
    process.exit();
  });

  const phone1 = "+9990";
  const phone2 = "+999";
  const tokens = new Map<
    { domain: string; phone: string },
    { accessToken: string; id: string }
  >();

  const domains = [
    { label: "preprod", url: "https://preprod.iambig.ai" },
    { label: "stage", url: "https://stage.iambig.ai" },
    { label: "dev", url: "https://dev.iambig.ai" },
  ];

  interface Metric {
    min: number;
    max: number;
    sum: number;
    count: number;
  }

  interface Metrics {
    [key: string]: {
      send: Metric;
      receive: Metric;
      dlvrd: Metric;
      read: Metric;
      errors: number;
    };
  }

  const metrics: Metrics = {
    dev: {
      send: { min: Infinity, max: 0, sum: 0, count: 0 },
      receive: { min: Infinity, max: 0, sum: 0, count: 0 },
      dlvrd: { min: Infinity, max: 0, sum: 0, count: 0 },
      read: { min: Infinity, max: 0, sum: 0, count: 0 },
      errors: 0,
    },
    stage: {
      send: { min: Infinity, max: 0, sum: 0, count: 0 },
      receive: { min: Infinity, max: 0, sum: 0, count: 0 },
      dlvrd: { min: Infinity, max: 0, sum: 0, count: 0 },
      read: { min: Infinity, max: 0, sum: 0, count: 0 },
      errors: 0,
    },
    preprod: {
      send: { min: Infinity, max: 0, sum: 0, count: 0 },
      receive: { min: Infinity, max: 0, sum: 0, count: 0 },
      dlvrd: { min: Infinity, max: 0, sum: 0, count: 0 },
      read: { min: Infinity, max: 0, sum: 0, count: 0 },
      errors: 0,
    },
  };

  const boxes: { [key: string]: any } = {
    dev: blessed.box({
      top: 2,
      padding: 1,
      shadow: true,
      width: 33,
      height: 11,
      content: "Loading metrics...",
      tags: true,
    }),
    stage: blessed.box({
      top: 2,
      left: 36,
      width: 33,
      height: 11,
      content: "stage",
      tags: true,
      padding: 1,
      shadow: true,
    }),
    preprod: blessed.box({
      top: 2,
      left: 72,
      width: 33,

      height: 11,
      content: "preprod",
      tags: true,
      border: {
        type: "bg",
      },

      shadow: true,
    }),
    devProgress: blessed.progressbar({
      top: 3,
      align: "right",

      height: 1,
      bg: "white",
      orientation: "horizontal",
    }),
    stageProgress: blessed.progressbar({
      top: 3,
      align: "right",

      height: 1,
      bg: "white",
    }),
    preprodProgress: blessed.progressbar({
      top: 3,
      align: "right",

      height: 1,
      bg: "white",
      orientation: "horizontal",
    }),
  };

  screen1.append(boxes.dev);
  screen1.append(boxes.stage);
  screen1.append(boxes.preprod);
  boxes.dev.append(boxes.devProgress);
  boxes.stage.append(boxes.stageProgress);
  boxes.preprod.append(boxes.preprodProgress);
  scr.render();

  const updateMetricsDisplay = (domain: string, label: string) => {
    let content = `${label.padEnd(10)} ${`${metrics[label].errors} errors`.padStart(20)}\n\n\n\n`;
    content += `          min   avg   max\n`;

    for (const [key, value] of Object.entries(metrics[label])) {
      if (key === "errors") continue;
      //@ts-ignore
      content += `${key.padEnd(10)}${Math.round(value.min).toString().padStart(3)}   ${Math.round(value.sum / value.count)}   ${Math.round(value.max)}\n`;
    }
    boxes[label as keyof typeof boxes].setContent(content);
    const progressBar: blessed.Widgets.ProgressBarElement =
      boxes[`${label}Progress` as keyof typeof boxes];
    const progress = metrics[label].send.count / iterations; // Ensure progress doesn't exceed 100%
    // console.log(progressBar);

    progressBar.setProgress(progress * 100);
    progressBar.content = `${metrics[label].send.count} / ${iterations}`;
    scr.render();
  };

  let i = 0;
  screen1.key(["i"], function (ch, key) {
    i += 1;
    boxes.stageProgress.progress(i);
    boxes.devProgress.setProgress(i);
    scr.render();
  });
  // Update metrics display in real-time
  // setInterval(() => {
  //   for (const { label, url } of domains) {
  //     updateMetricsDisplay(url, label);
  //   }
  // }, 1000); // Update every second

  const updateMetrics = (domainMetrics: any, metric: any, time: number) => {
    if (time < metric.min) metric.min = time;
    if (time > metric.max) metric.max = time;
    metric.sum += time;
    metric.count += 1;
  };

  const runMetrics = async (url: string, label: string) => {
    const baseUrl = url;
    const wsUrl = url.replace("http", "ws") + "/websocket";

    let user1Jwt: string;
    let user2Jwt: string;
    let user1Id: string;
    let user2Id: string;
    let ws1: WebSocket;
    let ws2: WebSocket;

    const { accessToken: acc1, id: id1 } = await verifyCode(
      baseUrl,
      phone1,
      "000000",
    );
    const { accessToken: acc2, id: id2 } = await verifyCode(
      baseUrl,
      phone2,
      "000000",
    );
    user1Jwt = acc1;
    user2Jwt = acc2;
    user1Id = id1;
    user2Id = id2;

    ws1 = new WebSocket(wsUrl, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    await new Promise((resolve) => ws1.on("open", resolve));
    ws2 = new WebSocket(wsUrl, {
      headers: { Authorization: `Bearer ${user2Jwt}` },
    });
    await new Promise((resolve) => ws2.on("open", resolve));

    const startTime = Date.now();
    const messageBody = {
      chatId: user2Id,
      message: "Hello, User2!",
      clientMessageId: Math.floor(getRand()() * 10000000).toString(),
    };

    const messageReceived = new Promise<void>((resolve) => {
      ws2.on("message", (message) => {
        const msg = JSON.parse(message.toString());
        if (msg.eventType === "new" && msg.payload.chatId === user1Id) {
          updateMetrics(
            metrics[label],
            metrics[label].receive,
            Date.now() - startTime,
          );
          updateMetricsDisplay(baseUrl, label);

          ws1.send(JSON.stringify({ type: "ack", id: msg.id }));
          resolve();
        }
      });
    });

    const dlvrdReceived = new Promise<void>((resolve) => {
      let ok = false;
      ws1.on("message", (message) => {
        const msg = JSON.parse(message.toString());
        ws1.send(JSON.stringify({ type: "ack", id: msg.id }));
        if (
          msg.eventType === "dlvrd" &&
          msg.payload.chatId === user2Id &&
          !ok
        ) {
          ok = true;
          updateMetrics(
            metrics[label],
            metrics[label].dlvrd,
            Date.now() - startTime,
          );
          updateMetricsDisplay(baseUrl, label);
          ws1.send(JSON.stringify({ type: "ack", id: msg.id }));
          resolve();
        }
      });
    });

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify(messageBody),
    });
    const endTime = Date.now();
    updateMetrics(metrics[label], metrics[label].send, endTime - startTime);
    updateMetricsDisplay(baseUrl, label);
    if (!response.ok) {
      metrics[label].errors++;
      return;
    }

    await Promise.race([
      messageReceived,
      timeout(10000)
    ]).catch(() => metrics[label].errors++);
    await Promise.race([
      dlvrdReceived,
      timeout(10000)
    ]).catch(() => metrics[label].errors++);

    const readReceived = new Promise<void>((resolve) => {
      ws1.on("message", (message) => {
        const msg = JSON.parse(message.toString());
        ws1.send(JSON.stringify({ type: "ack", id: msg.id }));
        if (msg.eventType === "read" && msg.payload.chatId === user2Id) {
          updateMetrics(
            metrics[label],
            metrics[label].read,
            Date.now() - readSentTime,
          );
          updateMetricsDisplay(baseUrl, label);

          resolve();
        }
      });
    });

  
    const readSentTime = Date.now();
    ws2.send(
      JSON.stringify({
        id: randomUUID(),
        type: "request",
        payloadType: "read",
        payload: { chatId: user1Id },
      }),
    );
    await Promise.race([
      readReceived,
      timeout(10000),
    ]).catch(() => metrics[label].errors++);

    ws1.close();
    ws2.close();
  };

  const verifyCode = async (
    baseUrl: string,
    phoneNumber: string,
    code: string,
  ) => {
    let token = tokens.get({ domain: baseUrl, phone: phoneNumber });
    if (token) return token;
    const response = await fetch(`${baseUrl}/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber, code }),
    });

    const data = (await response.json()) as any;
    const { accessToken, profile } = data;
    const id = profile.id;
    const resp2 = await fetch(`${baseUrl}/profile`, {
      method: "POST",
      body: JSON.stringify({ firstName: "vitest" }),
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    tokens.set({ domain: baseUrl, phone: phoneNumber }, { accessToken, id });
    return { accessToken, id };
  };

  (async () => {
    const p = [];
    for (const { label, url } of domains) {
      const domain = url;
      p.push(
        (async (domain) => {
          // console.log(`Running metrics for base URL: ${label} - ${url}`);
          for (let i = 0; i < iterations; i++) {
            await runMetrics(domain, label);
          }
        })(url),
      );

      // Reset metrics for the next domain
    }
    await Promise.all(p);
  })();
})();

const timeout = (ms = 10000) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms),
  );
