import si from "systeminformation";
import axios from "axios";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));

async function collect() {
    const [cpu, mem, disk, osInfo, load, network, processes, time] =
        await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.osInfo(),
            si.currentLoad(),
            si.networkStats(),
            si.processes(),
            si.time(),
        ]);

    return {
        serverId: config.serverId,
        token: config.token,
        timestamp: Date.now(),

        cpu: {
            usage: cpu.currentLoad,
            cores: cpu.cpus.length,
        },

        memory: {
            total: mem.total,
            used: mem.used,
            free: mem.free,
            usagePercent: (mem.used / mem.total) * 100,
        },

        disk: disk.map((d) => ({
            fs: d.fs,
            size: d.size,
            used: d.used,
            usePercent: d.use,
        })),

        system: {
            platform: osInfo.platform,
            distro: osInfo.distro,
            uptime: time.uptime,
            loadAvg: load.avgLoad,
        },

        network: network.map((n) => ({
            iface: n.iface,
            rx: n.rx_bytes,
            tx: n.tx_bytes,
            rx_sec: n.rx_sec,
            tx_sec: n.tx_sec,
        })),

        processes: processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map((p) => ({
                pid: p.pid,
                name: p.name,
                cpu: p.cpu,
                mem: p.mem,
            })),
    };
}

async function send() {
    try {
        const data = await collect();

        await axios.post(config.apiUrl, data, {
            timeout: 5000,
        });

        console.log("Sent metrics:", new Date().toISOString());
    } catch (err) {
        console.error("Error sending metrics:", err.message);
    }
}

setInterval(send, 5000);
send();

console.log("Monitoring agent running...");
