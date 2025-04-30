/* App.tsx — full file (Arc Code field left in UI but no longer
   filters client-side; value passed to API only) */

   import React, { useEffect, useState } from "react";
   import DataVisualizer from "./DataVisualizer";
   
   /* ------------ types from the backend payload ------------------- */
   interface Recommendation {
     arc:                string;
     description:        string;
     avgSavings:         string;          // “$#,###”
     avgCost:            string;          // “$#,###”
     avgPayback:         number | string; // years
     implementationRate: string;          // “##.#%”
     recommended:        number;          // count
     top:                number;          // rank – added client-side
   }
   
   /* ------------ alias for the five sortable columns -------------- */
   type OrderField =
     | "Avg Savings"
     | "Avg Cost"
     | "Avg Payback"
     | "Impl. Rate"
     | "Recommended";
   
   /* ------------ API helpers -------------------------------------- */
   const AGG_URL     = "http://127.0.0.1:5000/aggregates";
   const OPTIONS_URL = "http://127.0.0.1:5000/filter-options";
   
   /* convert one row → numeric value for the chosen column */
   const numericFor = (r: Recommendation, field: OrderField): number => {
     switch (field) {
       case "Avg Savings":  return parseFloat(r.avgSavings.replace(/[$,]/g, ""));
       case "Avg Cost":     return parseFloat(r.avgCost.replace(/[$,]/g, ""));
       case "Avg Payback":  return typeof r.avgPayback === "number"
                               ? r.avgPayback
                               : parseFloat(r.avgPayback.toString());
       case "Impl. Rate":   return parseFloat(r.implementationRate);
       case "Recommended":  return r.recommended;
     }
   };
   
   /* =============================================================== */
   function App() {
     /* ---------- option lists for dropdowns ------------------------ */
     const [centers, setCenters] = useState<string[]>([]);
     const [states,  setStates ] = useState<string[]>([]);
     const [years,   setYears  ] = useState<number[]>([]);
   
     /* ---------- filter values ------------------------------------ */
     const [center,   setCenter  ] = useState("");
     const [stateUS,  setStateUS ] = useState("");
     const [yearOp,   setYearOp  ] = useState("=");
     const [yearVal,  setYearVal ] = useState("");
     const [minSavings,setMinSavings] = useState("");
     const [minCost,   setMinCost   ] = useState("");
     const [showTop,   setShowTop   ] = useState("10");
     const [orderBy,   setOrderBy   ] = useState<OrderField>("Impl. Rate");
     const [minReco,   setMinReco   ] = useState("10");
     const [arcCode,   setArcCode   ] = useState("");   // UI only
   
     /* ---------- table / graph state ------------------------------ */
     const [rows,      setRows     ] = useState<Recommendation[]>([]);
     const [filtered,  setFiltered ] = useState<Recommendation[]>([]);
     const [pageSize,  setPageSize ] = useState(10);
     const [page,      setPage     ] = useState(1);
     const [showGraph, setShowGraph] = useState(false);
     const [loading,   setLoading  ] = useState(false);
     const [err,       setErr      ] = useState<string>();
   
     /* ---------- *frozen* graph-parameter state ------------------- */
     const [graphCenter,   setGraphCenter  ] = useState("");
     const [graphState,    setGraphState   ] = useState("");
     const [graphTopCount, setGraphTopCount] = useState(10);
   
     /* ============================================================= */
     useEffect(() => {
       (async () => {
         try {
           const meta = await (await fetch(OPTIONS_URL)).json();
           if (!meta.success) throw new Error(meta.error);
           setCenters(meta.centers);
           setStates (meta.states);
           setYears  (meta.years);
         } catch {/* silent fallback */}
       })();
     }, []);
   
     /* ============================================================= */
     const fetchAggregates = async (qs = "") => {
       setLoading(true);
       setErr(undefined);
       try {
         const json = await (await fetch(`${AGG_URL}${qs}`)).json();
         if (!json.success) throw new Error(json.error || "API error");
         const ranked: Recommendation[] = json.data
           .sort((a:any,b:any)=>numericFor(b,orderBy)-numericFor(a,orderBy))
           .map((r:any,i:number)=>({...r, top: i+1}));
         setRows(ranked);
         setFiltered(ranked);
         setPage(1);
         setShowGraph(false);
       } catch (e:any) { setErr(e.message); }
       finally        { setLoading(false); }
     };
   
     useEffect(() => { fetchAggregates(); }, []);
   
     /* ============================================================= */
     const handleSearch = async () => {
       const p = new URLSearchParams();
       if (center)  p.append("center", center);
       if (stateUS) p.append("state",  stateUS);
       if (yearVal) p.append("fiscal_year", `${yearOp}${yearVal}`);
       if (arcCode) p.append("arc", arcCode.trim());  // sent to backend only
   
       await fetchAggregates(`?${p.toString()}`);
   
       setFiltered(prev =>
         prev
           .filter(r => r.recommended >= +minReco)
           .filter(r =>
             !minSavings ||
             parseFloat(r.avgSavings.replace(/[$,]/g,"")) >= +minSavings
           )
           .filter(r =>
             !minCost ||
             parseFloat(r.avgCost.replace(/[$,]/g,"")) >= +minCost
           )
           /* client-side Arc filtering removed */
           .sort((a,b) => numericFor(b,orderBy) - numericFor(a,orderBy))
           .slice(0,+showTop)
           .map((r,i)=>({...r, top: i+1}))
       );
       setPage(1);
       setShowGraph(false);
     };
   
     const resetFilters = () => {
       setCenter(""); setStateUS("");
       setYearOp("="); setYearVal("");
       setMinSavings(""); setMinCost("");
       setShowTop("10"); setOrderBy("Impl. Rate"); setMinReco("10");
       setArcCode("");
       setFiltered(rows); setPage(1); setShowGraph(false);
     };
   
     /* ============================================================= */
     const totalPages = Math.ceil(filtered.length / pageSize) || 1;
     const slice      = filtered.slice(
       (page-1)*pageSize,
       (page-1)*pageSize + pageSize
     );
   
     /* ============================================================= */
     if (loading) return <p className="p-10 text-center">Loading…</p>;
     if (err)     return <p className="p-10 text-center text-red-600">{err}</p>;
   
     return (
       <div className="bg-gray-100 min-h-screen p-8">
         {/* ------------------ FILTERS CARD ------------------------ */}
         <div className="bg-white p-6 rounded shadow mb-8">
           <h2 className="text-xl font-bold mb-4">Filters</h2>
   
           <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Center */}
             <div>
               <label className="block text-sm font-medium mb-1">Center</label>
               <select value={center}
                       onChange={e=>setCenter(e.target.value)}
                       className="border p-2 rounded w-full">
                 <option value="">All</option>
                 {centers.map(c=><option key={c}>{c}</option>)}
               </select>
             </div>
   
             {/* State */}
             <div>
               <label className="block text-sm font-medium mb-1">State</label>
               <select value={stateUS}
                       onChange={e=>setStateUS(e.target.value)}
                       className="border p-2 rounded w-full">
                 <option value="">All</option>
                 {states.map(s=><option key={s}>{s}</option>)}
               </select>
             </div>
   
             {/* Fiscal Year */}
             <div>
               <label className="block text-sm font-medium mb-1">Fiscal Year</label>
               <div className="flex">
                 <select value={yearOp}
                         onChange={e=>setYearOp(e.target.value)}
                         className="border rounded-l p-2">
                   <option value="=">=</option>
                   <option value="<=">≤</option>
                   <option value=">=">≥</option>
                 </select>
                 <select value={yearVal}
                         onChange={e=>setYearVal(e.target.value)}
                         className="border-t border-b border-r rounded-r p-2 flex-1">
                   <option value="">Any</option>
                   {years.map(y=><option key={y}>{y}</option>)}
                 </select>
               </div>
             </div>
   
             {/* Min Savings */}
             <div>
               <label className="block text-sm font-medium mb-1">Min Savings ($)</label>
               <input value={minSavings}
                      onChange={e=>setMinSavings(e.target.value)}
                      className="border p-2 rounded w-full" />
             </div>
   
             {/* Min Cost */}
             <div>
               <label className="block text-sm font-medium mb-1">Min Cost ($)</label>
               <input value={minCost}
                      onChange={e=>setMinCost(e.target.value)}
                      className="border p-2 rounded w-full" />
             </div>
   
             {/* Show Top */}
             <div>
               <label className="block text-sm font-medium mb-1">Show Top</label>
               <select value={showTop}
                       onChange={e=>setShowTop(e.target.value)}
                       className="border p-2 rounded w-full">
                 {["10","25","50"].map(n=><option key={n}>{n}</option>)}
               </select>
             </div>
   
             {/* Order By */}
             <div>
               <label className="block text-sm font-medium mb-1">Order By</label>
               <select value={orderBy}
                       onChange={e=>setOrderBy(e.target.value as OrderField)}
                       className="border p-2 rounded w-full">
                 <option>Avg Savings</option>
                 <option>Avg Cost</option>
                 <option>Avg Payback</option>
                 <option>Impl. Rate</option>
                 <option>Recommended</option>
               </select>
             </div>
   
             {/* Min # Recs */}
             <div>
               <label className="block text-sm font-medium mb-1">Min # Recs</label>
               <select value={minReco}
                       onChange={e=>setMinReco(e.target.value)}
                       className="border p-2 rounded w-full">
                 {["5","10","15"].map(n=><option key={n}>{n}</option>)}
               </select>
             </div>
   
             {/* Arc Code (UI only) */}
             <div className="md:col-start-1 lg:col-start-1">
               <label className="block text-sm font-medium mb-1">
                 Arc Code&nbsp;(decimal prefix)
               </label>
               <input value={arcCode}
                      onChange={e=>setArcCode(e.target.value)}
                      placeholder="e.g. 2.2"
                      className="border p-2 rounded w-full" />
             </div>
           </div>
   
           {/* Buttons */}
           <div className="flex gap-4 mt-6">
             <button onClick={resetFilters}
                     className="px-4 py-2 border rounded">Reset</button>
   
             <button onClick={handleSearch}
                     className="px-4 py-2 bg-blue-600 text-white rounded">
               Search
             </button>
   
             <button
               onClick={() => {
                 setGraphCenter(center);
                 setGraphState(stateUS);
                 setGraphTopCount(+showTop);
                 setShowGraph(true);
               }}
               disabled={!filtered.length}
               className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
             >
               Generate Graph
             </button>
           </div>
         </div>
   
         {/* ------------------ TABLE OR GRAPH ---------------------- */}
         {!showGraph ? (
           <div className="bg-white rounded shadow">
             <div className="p-4 border-b text-sm text-gray-600">
               {filtered.length} records • page {page}/{totalPages}
               <select
                 value={pageSize}
                 onChange={e => {
                   const newSize = +e.target.value;
                   setPageSize(newSize);
                   setPage(1);
                 }}
                 className="ml-4 border p-1 rounded"
               >
                 {[10,20,50].map(n=><option key={n}>{n}</option>)}
               </select>
             </div>
   
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                 {[
                   "TOP","ARC","Description","Recommended","Avg Savings","Avg Cost",
                   "Avg Payback","Impl. Rate"
                 ].map(h=>(
                   <th key={h}
                       className="px-4 py-2 text-xs font-medium text-gray-600 uppercase">
                     {h}
                   </th>
                 ))}
               </thead>
               <tbody className="divide-y">
                 {slice.map(r=>(
                   <tr key={r.arc} className="hover:bg-gray-50 text-sm">
                     <td className="px-4 py-2">{r.top}</td>
                     <td className="px-4 py-2 text-blue-600">{r.arc}</td>
                     <td className="px-4 py-2">{r.description}</td>
                     <td className="px-4 py-2 text-center">{r.recommended}</td>
                     <td className="px-4 py-2 text-center">{r.avgSavings}</td>
                     <td className="px-4 py-2 text-center">{r.avgCost}</td>
                     <td className="px-4 py-2 text-center">{r.avgPayback}</td>
                     <td className="px-4 py-2 text-center">{r.implementationRate}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
   
             <div className="p-4 flex justify-between">
               <button
                 onClick={()=>setPage(p=>p-1)}
                 disabled={page===1}
                 className="border px-3 py-1 rounded disabled:opacity-50"
               >
                 Prev
               </button>
               <button
                 onClick={()=>setPage(p=>p+1)}
                 disabled={page===totalPages}
                 className="border px-3 py-1 rounded disabled:opacity-50"
               >
                 Next
               </button>
             </div>
           </div>
         ) : (
           <div className="bg-white rounded shadow p-4">
             <button
               onClick={()=>setShowGraph(false)}
               className="mb-4 px-4 py-2 border rounded"
             >
               ← Back to Table
             </button>
   
             <DataVisualizer
               data={filtered}
               years={years}
               center={graphCenter}
               state={graphState}
               topCount={graphTopCount}
             />
           </div>
         )}
       </div>
     );
   }
   
   export default App;
   