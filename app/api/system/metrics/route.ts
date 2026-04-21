import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Execute system commands to gather metrics
    const [cpuInfo, memInfo, diskInfo, networkInfo, loadAvgResults, uptimeResults] = await Promise.allSettled([
      // CPU Info and usage
      execAsync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)/($2+$4+$5)*100} END {print usage}'"),
      // Memory Info
      execAsync("free | grep Mem | awk '{print $3,$2}'"),
      // Disk Info
      execAsync("df / | tail -1 | awk '{print $3,$2,$5,$6}'"),
      // Network Interfaces
      execAsync("ip -o link show | wc -l"),
      // Load Average
      execAsync("cat /proc/loadavg | awk '{print $1,$2,$3}'"),
      // Uptime
      execAsync("cat /proc/uptime | awk '{print $1}'")
    ]);

    // CPU Model and cores
    const cpuModel = os.cpus()[0]?.model || 'Unknown';
    const cpuCores = os.cpus().length;

    // CPU Usage (calculate properly)
    let cpuUsage = 0;
    if (cpuInfo.status === 'fulfilled') {
      const usage = parseFloat(cpuInfo.value.stdout.trim());
      cpuUsage = isNaN(usage) ? 0 : usage;
    }

    // Memory Info
    let memoryUsed = 0, memoryTotal = 0, memoryPercentage = 0;
    if (memInfo.status === 'fulfilled') {
      const [used, total] = memInfo.value.stdout.trim().split(' ').map(x => parseInt(x) * 1024); // Convert KB to bytes
      memoryUsed = used;
      memoryTotal = total;
      memoryPercentage = (used / total) * 100;
    }

    // Disk Info
    let diskUsed = 0, diskTotal = 0, diskPercentage = 0, filesystem = '/';
    if (diskInfo.status === 'fulfilled') {
      const [used, total, percent, fs] = diskInfo.value.stdout.trim().split(' ');
      diskUsed = parseInt(used) * 1024; // Convert KB to bytes
      diskTotal = parseInt(total) * 1024;
      diskPercentage = parseFloat(percent.replace('%', ''));
      filesystem = fs;
    }

    // Network Interfaces Count
    let networkInterfaces = 0;
    if (networkInfo.status === 'fulfilled') {
      networkInterfaces = parseInt(networkInfo.value.stdout.trim()) || 0;
    }

    // Load Average
    let loadAvg: [number, number, number] = [0, 0, 0];
    if (loadAvgResults.status === 'fulfilled') {
      loadAvg = loadAvgResults.value.stdout.trim().split(' ').slice(0, 3).map(x => parseFloat(x) || 0) as [number, number, number];
    }

    // Uptime
    let uptime = 0;
    if (uptimeResults.status === 'fulfilled') {
      uptime = parseFloat(uptimeResults.value.stdout.trim()) || 0;
    }

    // Network traffic (basic estimation)
    const rxBytes = 0; // Would need more complex monitoring
    const txBytes = 0;

    const metrics = {
      cpu: {
        usage: cpuUsage,
        cores: cpuCores,
        model: cpuModel.trim()
      },
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        percentage: memoryPercentage
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percentage: diskPercentage,
        filesystem
      },
      network: {
        rx_bytes: rxBytes,
        tx_bytes: txBytes,
        interfaces: networkInterfaces
      },
      load_avg: loadAvg as [number, number, number],
      uptime
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
