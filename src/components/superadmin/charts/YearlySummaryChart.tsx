"use client";
import React from "react";
import {
  RadialBarChart,
  RadialBar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const YearlySummaryChart = ({ data }: { data: any[] }) => {
  const totals = data.reduce(
    (acc, curr) => {
      acc.totalBilled += curr.expected || 0;
      acc.totalPaid += curr.income || 0;
      return acc;
    },
    { totalBilled: 0, totalPaid: 0 },
  );

  const pending = Math.max(0, totals.totalBilled - totals.totalPaid);

  const chartData = [
    { name: "Invoiced", value: totals.totalBilled, fill: "#6366f1" },
    { name: "Income", value: totals.totalPaid, fill: "#10b981" },
    { name: "Pending", value: pending, fill: "#f43f5e" },
  ];

  return (
    <div className="w-full bg-white p-2 rounded-md border border-slate-100 shadow-sm flex flex-col">
      <div className="mb-2">
        <h3 className="text-[12px] font-bold text-slate-800 uppercase">
          Yearly Financial Summary
        </h3>
      </div>

      <div style={{ width: "100%", height: 275 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="25%"
            outerRadius="90%"
            barSize={22}
            data={chartData}
            startAngle={-90}
            endAngle={270}
          >
            <RadialBar
              background
              dataKey="value"
              label={{
                position: "insideStart",
                fill: "#fff",
                fontSize: 10,
                fontWeight: "bold",
                formatter: (val: number) =>
                  val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val,
              }}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-2 rounded-md shadow-2xl text-[10px] font-bold">
                      {payload[0].payload.name}: <br />
                      <span className="text-lg text-indigo-300">
                        Rs.{payload[0].value?.toLocaleString()}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-auto pt-2 border-t border-slate-200 flex justify-between items-center px-1">
        <div>
          <p className="text-[10px] text-slate-500 uppercase">
            Recovery Status
          </p>
          <p className="text-sm text-indigo-600">
            {totals.totalBilled > 0
              ? ((totals.totalPaid / totals.totalBilled) * 100).toFixed(1)
              : 0}
            % Collected
          </p>
        </div>
        <div className="h-5 w-10 rounded-md border border-slate-300 border-t-indigo-500 flex items-center justify-center text-[8px]">
          GOAL
        </div>
      </div>
    </div>
  );
};

export default YearlySummaryChart;
