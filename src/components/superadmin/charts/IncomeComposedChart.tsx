"use client";
import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const IncomeComposedChart = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch("/api/superadmin/stats/revenue");
        const result = await res.json();
        if (Array.isArray(result)) setData(result);
      } catch (err) {
        console.error("Chart data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!isMounted || loading) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center bg-slate-50 animate-pulse rounded-[2rem]">
        <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">
          Loading Financial Data...
        </span>
      </div>
    );
  }

  // --- CUSTOM TOOLTIP DESIGN ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { expected, income, pending } = payload[0].payload;
      return (
        <div className="bg-white p-2 shadow-2xl border-none rounded-md ring-1 ring-black/5">
          <p className=" mb-2 text-slate-800 border-b pb-1 text-sm">
            {label} Analytics
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-4 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Total Billed:
              </span>
              <span className="text-sm font-black text-slate-700">
                Rs.{expected.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4 items-center">
              <span className="text-[10px] font-bold text-emerald-500 uppercase">
                Collected:
              </span>
              <span className="text-sm font-black text-emerald-600">
                Rs.{income.toLocaleString()}
              </span>
            </div>
            <div className="h-[1px] bg-slate-100 my-1" />
            <div className="flex justify-between gap-4 items-center">
              <span className="text-[10px] font-bold text-rose-400 uppercase italic">
                Pending:
              </span>
              <span className="text-sm font-black text-rose-500 underline">
                Rs.{pending.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-2 rounded-md border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-2 px-2">
        <h3 className="text-[12px] font-bold text-slate-800 uppercase">
          Monthly Revenue
        </h3>
        <p className="text-[10px] text-slate-700 uppercase">
          Financial Year {new Date().getFullYear()}
        </p>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <CartesianGrid
              stroke="#f1f5f9"
              vertical={false}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
              tickFormatter={(value) =>
                `Rs.${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`
              }
            />

            {/* --- USE CUSTOM TOOLTIP --- */}
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />

            <Area
              type="monotone"
              dataKey="expected"
              fill="#EEF2FF"
              stroke="#C7D2FE"
              name="Total Billed"
              strokeWidth={2}
            />

            <Bar
              dataKey="income"
              barSize={24}
              fill="#4F46E5"
              name="Collected"
              radius={[6, 6, 0, 0]}
            />

            <Line
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
              name="Payment Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default IncomeComposedChart;
