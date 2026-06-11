import { useEffect, useState, useRef } from "react";
import "./App.css";
import pkg, { ReadyState } from "react-use-websocket";

const useWebSocket = ((pkg as any).default ?? pkg) as typeof pkg;

const outputPins = [18, 19, 22, 23];
const defaultOutputPin = outputPins[0];
const WS_URL = `${import.meta.env.VITE_WS_URL}?x-api-key=${import.meta.env.VITE_WS_API_KEY}`;

type MessageBody = {
  action: string;
  type: string;
  body: unknown;
};

function App() {
  const { lastMessage, sendMessage, readyState } = useWebSocket(WS_URL, {
    heartbeat: {
      message: JSON.stringify({ action: "msg", type: "ping" }),
      returnMessage: JSON.stringify({ action: "msg", type: "pong" }),
      timeout: 540000,
      interval: 480000,
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const [selectedPin, setSelectedPin] = useState(defaultOutputPin);
  const [pinValue, setPinValue] = useState(false);
  const intialized = useRef(false);

  useEffect(() => {
    if (lastMessage === null) {
      return;
    }

    const parsedMessageBody = JSON.parse(lastMessage.data) as MessageBody;

    if (parsedMessageBody.action !== "msg") {
      return;
    }

    if (parsedMessageBody.type === "output") {
      const body = parsedMessageBody.body;
      setPinValue(body === "0" ? false : true);
    }
  }, [lastMessage, selectedPin]);

  useEffect(() => {
    if (readyState === ReadyState.OPEN && !intialized.current) {
      intialized.current = true;

      outputPins.forEach((pin) => {
        sendMessage(
          JSON.stringify({
            action: "msg",
            type: "cmd",
            body: {
              type: "pinMode",
              pin,
              mode: "output",
            },
          }),
        );
      });

      sendMessage(
        JSON.stringify({
          action: "msg",
          type: "cmd",
          body: {
            type: "digitalRead",
            pin: defaultOutputPin,
          },
        }),
      );
    }

    // Reset the flag if the socket drops, so a genuinely NEW connection
    // (after reconnect) re-initializes the pins
    if (readyState === ReadyState.CLOSED) {
      intialized.current = false;
    }
  },[readyState, sendMessage]);

  return (
    <div className="App">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-6">ESP32 Control Panel</h1>

        <div className="flex flex-row items-center gap-6">
          <div className="m-10">
            <label className="block mb-2.5 text-sm font-medium text-heading">
              Select a Pin
            </label>
            <select
              value={selectedPin}
              onChange={(event) => {
                const newpin = parseInt(event.target.value, 10);
                setSelectedPin(newpin);
                sendMessage(
                  JSON.stringify(
                    {
                      action: "msg",
                      type: "cmd",
                      body: {
                        type: "digitalRead",
                        pin: newpin,
                      },
                    }),
                );
              }}
              className="rounded-full w-full px-5 py-2.5 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body"
            >
              {outputPins.map((pin, key) => (
                <option key={key} value={pin}>
                  GPIO{pin}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={pinValue}
                onChange={() => {
                  const newValue = !pinValue;
                  setPinValue(newValue);
                  sendMessage(
                    JSON.stringify({
                      action: "msg",
                      type: "cmd",
                      body: {
                        type: "digitalWrite",
                        pin: selectedPin,
                        value: newValue ? 1 : 0,
                      },
                    }),
                  );
                }}
                className="sr-only peer"
              />
              <div className="relative w-11 h-11 bg-gray-300 ring-2 ring-gray-400 peer-checked:ring-green-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              <span className="select-none ms-3 text-sm font-medium text-heading">
                {pinValue ? "ON" : "OFF"}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;