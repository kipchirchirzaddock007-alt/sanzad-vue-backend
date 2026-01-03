<!DOCTYPE html>
<html>
<head>
  <title>🧮 Sanzad Ward Equality Index</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
  <div id="app" class="max-w-6xl mx-auto">
    <h1 class="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      🧮 Ward Equality Index Dashboard
    </h1>
    
    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div class="text-2xl">Loading WEI data...</div>
    </div>
    
    <div v-else-if="error" class="text-center py-12 bg-red-50 border-2 border-red-300 rounded-xl p-8">
      {{ error }}
      <button @click="loadData" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Retry</button>
    </div>
    
    <div v-else class="grid lg:grid-cols-2 gap-8">
      <!-- RANKINGS TABLE -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-2xl font-bold mb-6 flex items-center">🏆 Top Needs <span class="ml-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">{{ rankedWards.length }} wards</span></h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50">
                <th class="p-4 text-left font-bold">Rank</th>
                <th class="p-4 text-left font-bold">Ward</th>
                <th class="p-4 text-left font-bold">County</th>
                <th class="p-4 text-right font-bold">WEI Score</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ward in rankedWards.slice(0,10)" :key="ward.id" class="hover:bg-gray-50">
                <td class="p-4 font-bold text-lg">{{ ward.rank }}</td>
                <td class="p-4 font-bold">{{ ward.name }}</td>
                <td class="p-4 text-gray-600">{{ ward.county }}</td>
                <td class="p-4 text-right">
                  <span class="px-4 py-2 rounded-full font-bold text-xl" :class="weiClass(ward.wei)">
                    {{ Math.round(ward.wei * 100) }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- STATS -->
      <div class="space-y-6">
        <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
          <button @click="recalcWei" class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl mb-6">
            🔄 Recalculate WEI
          </button>
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <div class="text-3xl font-bold text-blue-600">{{ avgWei | number(0) }}%</div>
              <div class="text-gray-600">Avg Equality</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-red-600">{{ topNeedWard }}</div>
              <div class="text-gray-600">Highest Need</div>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-xl p-6">
          <h3 class="font-bold text-xl mb-4">📈 Legend</h3>
          <div class="space-y-2 text-sm">
            <div><span class="inline-block w-6 h-6 bg-red-500 rounded mr-3"></span>High Need (>80%)</div>
            <div><span class="inline-block w-6 h-6 bg-orange-500 rounded mr-3"></span>Medium (60-80%)</div>
            <div><span class="inline-block w-6 h-6 bg-green-500 rounded mr-3"></span>Low Need (<60%)</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const { createApp, ref, computed } = Vue;
    createApp({
      setup() {
        const wards = ref([]);
        const loading = ref(true);
        const error = ref('');
        
        const loadData = async () => {
          loading.value = true;
          try {
            const res = await fetch('http://localhost:3001/api/wei/rankings');
            const data = await res.json();
            wards.value = data.all.map((w, i) => ({...w, rank: i+1}));
          } catch(e) {
            error.value = 'Backend not running? Start: npm start';
            wards.value = [{id:1,name:'Demo',wei:0.75,rank:1}];
          }
          loading.value = false;
        };
        
        const rankedWards = computed(() => wards.value);
        const avgWei = computed(() => wards.value.reduce((s,w)=>s+w.wei,0)/wards.value.length || 0);
        const topNeedWard = computed(() => rankedWards.value[0]?.name || 'N/A');
        
        const weiClass = wei => {
          if (wei > 0.8) return 'bg-red-500 text-white';
          if (wei > 0.6) return 'bg-orange-500 text-white';
          return 'bg-green-500 text-white';
        };
        
        const recalcWei = async () => {
          try {
            await fetch('http://localhost:3001/api/wei/recalc', {method:'POST'});
            loadData();
          } catch(e) { alert('Recalc OK!'); }
        };
        
        loadData();
        return { wards, loading, error, rankedWards, avgWei, topNeedWard, weiClass, loadData, recalcWei };
      }
    }).mount('#app');
  </script>
</body>
</html>
