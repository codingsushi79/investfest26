const http = require('http');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const PORT = 3416;

// HTML interface
const htmlInterface = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InvestFest Console</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #3e3e3e;
        }
        .header h1 {
            color: #4ec9b0;
            font-size: 24px;
        }
        .console {
            flex: 1;
            background: #252526;
            border: 1px solid #3e3e3e;
            border-radius: 4px;
            padding: 15px;
            overflow-y: auto;
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.6;
        }
        .output {
            margin-bottom: 10px;
        }
        .output.prompt {
            color: #4ec9b0;
        }
        .output.success {
            color: #4ec9b0;
        }
        .output.error {
            color: #f48771;
        }
        .output.info {
            color: #9cdcfe;
        }
        .output pre {
            background: #1e1e1e;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin-top: 5px;
        }
        .input-container {
            display: flex;
            gap: 10px;
        }
        input {
            flex: 1;
            background: #252526;
            border: 1px solid #3e3e3e;
            color: #d4d4d4;
            padding: 10px;
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
        }
        input:focus {
            outline: none;
            border-color: #4ec9b0;
        }
        button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
        }
        button:hover {
            background: #1177bb;
        }
        .help {
            margin-top: 10px;
            padding: 10px;
            background: #1e1e1e;
            border-radius: 4px;
            font-size: 12px;
            color: #858585;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 InvestFest Console</h1>
    </div>
    <div class="console" id="console"></div>
    <div class="input-container">
        <input type="text" id="commandInput" placeholder="Enter command (type 'help' for commands)" autocomplete="off">
        <button onclick="executeCommand()">Execute</button>
    </div>
    <div class="help">
        <strong>Tip:</strong> Use arrow keys to navigate command history. Commands are case-insensitive.
    </div>
    <script>
        const consoleEl = document.getElementById('console');
        const inputEl = document.getElementById('commandInput');
        let commandHistory = [];
        let historyIndex = -1;

        function addOutput(text, className = '') {
            const div = document.createElement('div');
            div.className = 'output ' + className;
            div.innerHTML = text;
            consoleEl.appendChild(div);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        function addPrompt(command) {
            addOutput('&gt; ' + command, 'prompt');
        }

        function executeCommand() {
            const command = inputEl.value.trim();
            if (!command) return;

            commandHistory.push(command);
            historyIndex = commandHistory.length;
            addPrompt(command);
            inputEl.value = '';

            fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    addOutput('Error: ' + data.error, 'error');
                } else {
                    const output = typeof data.result === 'string' 
                        ? data.result 
                        : '<pre>' + JSON.stringify(data.result, null, 2) + '</pre>';
                    addOutput(output, data.success ? 'success' : 'info');
                }
            })
            .catch(err => {
                addOutput('Error: ' + err.message, 'error');
            });
        }

        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                executeCommand();
            }
        });

        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    inputEl.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    inputEl.value = commandHistory[historyIndex];
                } else {
                    historyIndex = commandHistory.length;
                    inputEl.value = '';
                }
            }
        });

        // Initial welcome message
        addOutput('Welcome to InvestFest Console! Type "help" for available commands.', 'info');
        inputEl.focus();
    </script>
</body>
</html>
`;

// Command handlers
async function handleCommand(command) {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  try {
    switch (cmd) {
      case 'help':
        return {
          success: true,
          result: `Available commands:
  help                          - Show this help message
  users                         - List all users
  user <username>               - Get user details
  balance <username> <amount>   - Set user balance
  companies                     - List all companies
  prices <symbol>               - Get price history for a company
  update-price <symbol> <label> <value> - Add new price point
  holdings <username>           - Get user holdings
  transactions <username>       - Get user transactions
  stats                         - System statistics
  query <sql>                   - Execute raw SQL query (use with caution)
  clear                         - Clear console (client-side)`
        };

      case 'users':
        const users = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            balance: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return { success: true, result: users };

      case 'user':
        if (!args[0]) {
          return { success: false, result: 'Usage: user <username>' };
        }
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: args[0] },
              { email: args[0] },
            ],
          },
          include: {
            holdings: {
              include: { company: true },
            },
            transactions: {
              include: { company: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
        if (!user) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        return { success: true, result: user };

      case 'balance':
        if (args.length < 2) {
          return { success: false, result: 'Usage: balance <username> <amount>' };
        }
        const username = args[0];
        const amount = parseFloat(args[1]);
        if (isNaN(amount)) {
          return { success: false, result: 'Invalid amount' };
        }
        const userToUpdate = await prisma.user.findFirst({
          where: { username },
        });
        if (!userToUpdate) {
          return { success: false, result: `User not found: ${username}` };
        }
        await prisma.user.update({
          where: { id: userToUpdate.id },
          data: { balance: amount },
        });
        return { success: true, result: `Updated ${username} balance to $${amount.toFixed(2)}` };

      case 'companies':
        const companies = await prisma.company.findMany({
          include: {
            prices: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        const companiesWithLatestPrice = companies.map(c => ({
          symbol: c.symbol,
          name: c.name,
          latestPrice: c.prices[0]?.value || 0,
          priceCount: c.prices.length,
        }));
        return { success: true, result: companiesWithLatestPrice };

      case 'prices':
        if (!args[0]) {
          return { success: false, result: 'Usage: prices <symbol>' };
        }
        const company = await prisma.company.findUnique({
          where: { symbol: args[0].toUpperCase() },
          include: {
            prices: {
              orderBy: { createdAt: 'asc' },
            },
          },
        });
        if (!company) {
          return { success: false, result: `Company not found: ${args[0]}` };
        }
        return { success: true, result: {
          symbol: company.symbol,
          name: company.name,
          prices: company.prices.map(p => ({
            label: p.label,
            value: p.value,
            createdAt: p.createdAt,
          })),
        }};

      case 'update-price':
        if (args.length < 3) {
          return { success: false, result: 'Usage: update-price <symbol> <label> <value>' };
        }
        const symbol = args[0].toUpperCase();
        const label = args[1];
        const value = parseFloat(args[2]);
        if (isNaN(value)) {
          return { success: false, result: 'Invalid value' };
        }
        const companyForPrice = await prisma.company.findUnique({
          where: { symbol },
        });
        if (!companyForPrice) {
          return { success: false, result: `Company not found: ${symbol}` };
        }
        await prisma.pricePoint.create({
          data: {
            companyId: companyForPrice.id,
            label,
            value,
          },
        });
        return { success: true, result: `Added price point: ${symbol} ${label} = $${value.toFixed(2)}` };

      case 'holdings':
        if (!args[0]) {
          return { success: false, result: 'Usage: holdings <username>' };
        }
        const userForHoldings = await prisma.user.findFirst({
          where: { username: args[0] },
        });
        if (!userForHoldings) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        const holdings = await prisma.holding.findMany({
          where: { userId: userForHoldings.id },
          include: {
            company: {
              include: {
                prices: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });
        const holdingsWithValue = holdings.map(h => ({
          symbol: h.company.symbol,
          name: h.company.name,
          shares: h.shares,
          latestPrice: h.company.prices[0]?.value || 0,
          totalValue: h.shares * (h.company.prices[0]?.value || 0),
        }));
        return { success: true, result: holdingsWithValue };

      case 'transactions':
        if (!args[0]) {
          return { success: false, result: 'Usage: transactions <username>' };
        }
        const userForTransactions = await prisma.user.findFirst({
          where: { username: args[0] },
        });
        if (!userForTransactions) {
          return { success: false, result: `User not found: ${args[0]}` };
        }
        const transactions = await prisma.transaction.findMany({
          where: { userId: userForTransactions.id },
          include: {
            company: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        return { success: true, result: transactions.map(t => ({
          type: t.type,
          symbol: t.company.symbol,
          shares: t.shares,
          price: t.price,
          total: t.shares * t.price,
          createdAt: t.createdAt,
        }))};

      case 'stats':
        const userCount = await prisma.user.count();
        const companyCount = await prisma.company.count();
        const transactionCount = await prisma.transaction.count();
        const totalBalance = await prisma.user.aggregate({
          _sum: { balance: true },
        });
        return { success: true, result: {
          users: userCount,
          companies: companyCount,
          transactions: transactionCount,
          totalBalance: totalBalance._sum.balance || 0,
        }};

      case 'query':
        if (!args.length) {
          return { success: false, result: 'Usage: query <sql>' };
        }
        const sql = args.join(' ');
        // Use Prisma's raw query - be careful!
        const result = await prisma.$queryRawUnsafe(sql);
        return { success: true, result: result };

      case 'clear':
        return { success: true, result: 'Console cleared (this is handled client-side)' };

      default:
        return { success: false, result: `Unknown command: ${cmd}. Type 'help' for available commands.` };
    }
  } catch (error) {
    return { success: false, result: error.message };
  }
}

// HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlInterface);
    return;
  }

  if (req.url === '/api/command' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { command } = JSON.parse(body);
        const result = await handleCommand(command);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Console server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down console server...');
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
});

