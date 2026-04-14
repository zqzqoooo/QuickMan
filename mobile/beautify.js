const fs = require('fs');

function beautify(file) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes("import { Ionicons }")) {
        content = "import { Ionicons } from '@expo/vector-icons';\n" + content;
    }

    // Common replacements inside Text elements:
    
    // Adminscreen Emojis:
    content = content.replace(/\{printerConnected \? `🖨️ \$\{printerName\}` : '🖨️ Not Connected'\}/g, 
      `{printerConnected ? <Text><Ionicons name="print" size={11} color="#4CAF50"/> {printerName}</Text> : <Text><Ionicons name="print-outline" size={11} color="#F44336"/> Not Connected</Text>}`);
    
    content = content.replace(/\{isSyncing \? '↻' : '🔄'\}/g, `{isSyncing ? <Ionicons name="sync-outline" size={18} /> : <Ionicons name="sync" size={18} />}`);
    
    content = content.replace(/📷 Scan & Search/g, `<Ionicons name="scan" size={14} color="#32D74B" /> Scan & Search`);
    content = content.replace(/➕ \{activeTab === 'cabinets' \? 'Cabinet' : 'Asset'\}/g, `<Ionicons name="add" size={14} color="#32D74B" /> {activeTab === 'cabinets' ? 'Cabinet' : 'Asset'}`);
    
    content = content.replace(/🗄️ Cabinets/g, `<Ionicons name="server-outline" size={14} /> Cabinets`);
    content = content.replace(/📦 Assets/g, `<Ionicons name="cube-outline" size={14} /> Assets`);

    // MainScreen Emojis:
    content = content.replace(/👋 \{username\}/g, `<Ionicons name="hand-right-outline" size={20} color="#fff" /> {username}`);
    content = content.replace(/<Text style=\{styles.scanBtnIcon\}>📤<\/Text>/g, `<Ionicons name="arrow-up-circle-outline" size={36} color="#F44336" style={{marginBottom: 8}} />`);
    content = content.replace(/<Text style=\{styles.scanBtnIcon\}>📥<\/Text>/g, `<Ionicons name="arrow-down-circle-outline" size={36} color="#4CAF50" style={{marginBottom: 8}} />`);
    
    content = content.replace(/📋 Recent Activity/g, `<Ionicons name="list" size={12} color="#888" /> Recent Activity`);
    
    content = content.replace(/<Text style=\{styles.recentIcon\}>\{item.action === 'Checked Out' \? '📤' : '📥'\}<\/Text>/g, 
      `<Ionicons name={item.action === 'Checked Out' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={24} color={item.action === 'Checked Out' ? '#F44336' : '#4CAF50'} style={{marginRight: 12}} />`);
      
    content = content.replace(/📋 Confirm/g, `<Ionicons name="clipboard-outline" size={20} color="#fff" /> Confirm`);
    content = content.replace(/📍 \{confirmData\.cabinet_name \|\| "Unknown Cabinet"\}/g, `<Ionicons name="location" size={12} color="#888" /> {confirmData.cabinet_name || "Unknown Cabinet"}`);
    
    content = content.replace(/<Text style=\{\{ fontSize: 24, marginBottom: 8 \}\}>⬇<\/Text>/g, `<Ionicons name="arrow-down-outline" size={24} color="#fff" style={{marginBottom: 8}} />`);
    
    content = content.replace(/✅ Confirm/g, `<Ionicons name="checkmark-circle-outline" size={16} color="#fff" /> Confirm`);

    // SettingsScreen Emojis:
    content = content.replace(/👤 \{user.username\}/g, `<Ionicons name="person-circle-outline" size={16} color="#32D74B" /> {user.username}`);
    content = content.replace(/☁️ Sync Cloud Data/g, `<Ionicons name="cloud-upload-outline" size={16} color="#000" /> Sync Cloud Data`);
    content = content.replace(/✅ \{connectedPrinter\}/g, `<Ionicons name="print" size={14} color="#32D74B" /> {connectedPrinter}`);
    content = content.replace(/❌ Not Connected/g, `<Ionicons name="print-outline" size={14} color="#666" /> Not Connected`);
    
    content = content.replace(/🔄 Rescan/g, `<Ionicons name="refresh" size={14} /> Rescan`);
    content = content.replace(/<Text style=\{styles.printerIcon\}>🖨️<\/Text>/g, `<Ionicons name="print-outline" size={20} color="#fff" style={{marginRight: 10}} />`);
    
    content = content.replace(/📡 Scan Nearby Printers/g, `<Ionicons name="radio-outline" size={14} color="#32D74B" /> Scan Nearby Printers`);
    content = content.replace(/🖨️ Print Test Label/g, `<Ionicons name="document-text-outline" size={15} color="#fff" /> Print Test Label`);

    fs.writeFileSync(file, content, 'utf8');
}

['src/screens/AdminScreen.js', 'src/screens/MainScreen.js', 'src/screens/SettingsScreen.js'].forEach(beautify);
