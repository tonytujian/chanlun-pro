import { WorkerMessage, WorkerResponse } from '../types';

export class WorkerManager {
  private workers: { [key: string]: Worker } = {};
  private messageHandlers: { [id: string]: (response: WorkerResponse) => void } = {};
  private messageId = 0;

  constructor() {
    this.initialize();
  }

  initialize() {
    // 创建不同类型的Worker
    this.createWorker('indicators', '/workers/indicators.worker.js');
    this.createWorker('strategies', '/workers/strategies.worker.js');
    this.createWorker('backtest', '/workers/backtest.worker.js');
    this.createWorker('patterns', '/workers/patterns.worker.js');
    this.createWorker('optimization', '/workers/optimization.worker.js');
  }

  private createWorker(name: string, scriptPath: string) {
    try {
      // 在开发环境中，我们使用内联Worker
      const workerCode = this.getWorkerCode(name);
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const handler = this.messageHandlers[response.id];
        if (handler) {
          handler(response);
          delete this.messageHandlers[response.id];
        }
      };

      worker.onerror = (error) => {
        console.error(`Worker ${name} error:`, error);
      };

      this.workers[name] = worker;
    } catch (error) {
      console.error(`Failed to create worker ${name}:`, error);
    }
  }

  private getWorkerCode(workerType: string): string {
    // 根据worker类型返回相应的代码
    switch (workerType) {
      case 'indicators':
        return this.getIndicatorsWorkerCode();
      case 'strategies':
        return this.getStrategiesWorkerCode();
      case 'backtest':
        return this.getBacktestWorkerCode();
      case 'patterns':
        return this.getPatternsWorkerCode();
      case 'optimization':
        return this.getOptimizationWorkerCode();
      default:
        return '';
    }
  }

  private getIndicatorsWorkerCode(): string {
    return `
      // 技术指标计算Worker
      self.onmessage = function(event) {
        const { type, payload, id } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'CALCULATE_INDICATORS':
              result = calculateAllIndicators(payload.data);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
          
          self.postMessage({
            type: type + '_RESULT',
            payload: result,
            id: id
          });
        } catch (error) {
          self.postMessage({
            type: type + '_ERROR',
            payload: null,
            id: id,
            error: error.message
          });
        }
      };

      // 计算所有技术指标
      function calculateAllIndicators(data) {
        return data.map((item, index) => {
          const indicators = {};
          
          // 移动平均线
          indicators.ma5 = calculateMA(data, index, 5);
          indicators.ma10 = calculateMA(data, index, 10);
          indicators.ma20 = calculateMA(data, index, 20);
          indicators.ma50 = calculateMA(data, index, 50);
          
          // RSI
          indicators.rsi = calculateRSI(data, index, 14);
          
          // MACD
          const macd = calculateMACD(data, index);
          indicators.macd = macd.macd;
          indicators.macdSignal = macd.signal;
          indicators.macdHistogram = macd.histogram;
          
          // 布林带
          const bollinger = calculateBollinger(data, index, 20, 2);
          indicators.bollingerUpper = bollinger.upper;
          indicators.bollingerMiddle = bollinger.middle;
          indicators.bollingerLower = bollinger.lower;
          
          return {
            ...item,
            indicators
          };
        });
      }

      // 移动平均线计算
      function calculateMA(data, index, period) {
        if (index < period - 1) return null;
        
        let sum = 0;
        for (let i = index - period + 1; i <= index; i++) {
          sum += data[i].close;
        }
        return sum / period;
      }

      // RSI计算
      function calculateRSI(data, index, period) {
        if (index < period) return null;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = index - period + 1; i <= index; i++) {
          const change = data[i].close - data[i - 1].close;
          if (change > 0) {
            gains += change;
          } else {
            losses += Math.abs(change);
          }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
      }

      // MACD计算
      function calculateMACD(data, index) {
        const ema12 = calculateEMA(data, index, 12);
        const ema26 = calculateEMA(data, index, 26);
        
        if (ema12 === null || ema26 === null) {
          return { macd: null, signal: null, histogram: null };
        }
        
        const macd = ema12 - ema26;
        const signal = calculateEMAFromValues(getMACDValues(data, index), 9);
        const histogram = signal !== null ? macd - signal : null;
        
        return { macd, signal, histogram };
      }

      // EMA计算
      function calculateEMA(data, index, period) {
        if (index < period - 1) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = data[index - period + 1].close;
        
        for (let i = index - period + 2; i <= index; i++) {
          ema = (data[i].close - ema) * multiplier + ema;
        }
        
        return ema;
      }

      // 布林带计算
      function calculateBollinger(data, index, period, stdDev) {
        const ma = calculateMA(data, index, period);
        if (ma === null) return { upper: null, middle: null, lower: null };
        
        let sum = 0;
        for (let i = index - period + 1; i <= index; i++) {
          sum += Math.pow(data[i].close - ma, 2);
        }
        
        const variance = sum / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
          upper: ma + (standardDeviation * stdDev),
          middle: ma,
          lower: ma - (standardDeviation * stdDev)
        };
      }

      // 辅助函数
      function calculateEMAFromValues(values, period) {
        if (values.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = values[0];
        
        for (let i = 1; i < values.length; i++) {
          ema = (values[i] - ema) * multiplier + ema;
        }
        
        return ema;
      }

      function getMACDValues(data, index) {
        const values = [];
        for (let i = 0; i <= index; i++) {
          const ema12 = calculateEMA(data, i, 12);
          const ema26 = calculateEMA(data, i, 26);
          if (ema12 !== null && ema26 !== null) {
            values.push(ema12 - ema26);
          }
        }
        return values;
      }
    `;
  }

  private getStrategiesWorkerCode(): string {
    return `
      // 策略生成Worker
      self.onmessage = function(event) {
        const { type, payload, id } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'GENERATE_STRATEGIES':
              result = generateStrategies(payload);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
          
          self.postMessage({
            type: type + '_RESULT',
            payload: result,
            id: id
          });
        } catch (error) {
          self.postMessage({
            type: type + '_ERROR',
            payload: null,
            id: id,
            error: error.message
          });
        }
      };

      // 生成策略
      function generateStrategies(config) {
        const { data, populationSize = 50, generations = 20 } = config;
        
        // 遗传算法生成策略
        let population = initializePopulation(populationSize);
        
        for (let gen = 0; gen < generations; gen++) {
          // 评估适应度
          population = evaluatePopulation(population, data);
          
          // 选择、交叉、变异
          population = evolvePopulation(population);
          
          // 发送进度更新
          self.postMessage({
            type: 'GENERATION_PROGRESS',
            payload: {
              generation: gen + 1,
              totalGenerations: generations,
              bestFitness: Math.max(...population.map(ind => ind.fitness || 0))
            },
            id: 'progress'
          });
        }
        
        // 返回最佳策略
        return population
          .sort((a, b) => (b.fitness || 0) - (a.fitness || 0))
          .slice(0, 10)
          .map(ind => ind.strategy);
      }

      // 初始化种群
      function initializePopulation(size) {
        const population = [];
        const indicators = ['ma5', 'ma10', 'ma20', 'rsi', 'macd', 'bollingerUpper', 'bollingerLower'];
        const operators = ['>', '<', '>=', '<=', 'cross_above', 'cross_below'];
        
        for (let i = 0; i < size; i++) {
          const strategy = {
            id: 'strategy_' + Date.now() + '_' + i,
            name: 'Generated Strategy ' + (i + 1),
            description: 'Auto-generated trading strategy',
            buyConditions: [],
            sellConditions: [],
            stopLoss: Math.random() * 0.1 + 0.02, // 2-12%
            takeProfit: Math.random() * 0.2 + 0.05, // 5-25%
            maxHoldDays: Math.floor(Math.random() * 20) + 5 // 5-25天
          };
          
          // 生成买入条件
          const numBuyConditions = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numBuyConditions; j++) {
            strategy.buyConditions.push({
              indicator: indicators[Math.floor(Math.random() * indicators.length)],
              operator: operators[Math.floor(Math.random() * operators.length)],
              value: Math.random() * 100,
              weight: Math.random()
            });
          }
          
          // 生成卖出条件
          const numSellConditions = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numSellConditions; j++) {
            strategy.sellConditions.push({
              indicator: indicators[Math.floor(Math.random() * indicators.length)],
              operator: operators[Math.floor(Math.random() * operators.length)],
              value: Math.random() * 100,
              weight: Math.random()
            });
          }
          
          population.push({
            id: strategy.id,
            strategy: strategy,
            fitness: 0,
            generation: 0
          });
        }
        
        return population;
      }

      // 评估种群适应度
      function evaluatePopulation(population, data) {
        return population.map(individual => {
          const fitness = evaluateStrategy(individual.strategy, data);
          return {
            ...individual,
            fitness: fitness
          };
        });
      }

      // 评估单个策略
      function evaluateStrategy(strategy, data) {
        // 简化的回测逻辑
        let totalReturn = 0;
        let trades = 0;
        let wins = 0;
        
        for (let i = 50; i < data.length - 10; i++) {
          const current = data[i];
          
          // 检查买入信号
          if (checkConditions(strategy.buyConditions, data, i)) {
            // 模拟持有
            const holdDays = Math.min(strategy.maxHoldDays || 10, data.length - i - 1);
            const exitPrice = data[i + holdDays].close;
            const returnRate = (exitPrice - current.close) / current.close;
            
            totalReturn += returnRate;
            trades++;
            if (returnRate > 0) wins++;
          }
        }
        
        if (trades === 0) return 0;
        
        const avgReturn = totalReturn / trades;
        const winRate = wins / trades;
        
        // 综合评分
        return avgReturn * 100 + winRate * 50;
      }

      // 检查条件
      function checkConditions(conditions, data, index) {
        if (conditions.length === 0) return false;
        
        let score = 0;
        let totalWeight = 0;
        
        for (const condition of conditions) {
          const weight = condition.weight || 1;
          totalWeight += weight;
          
          if (evaluateCondition(condition, data, index)) {
            score += weight;
          }
        }
        
        return score / totalWeight > 0.5; // 50%的条件满足
      }

      // 评估单个条件
      function evaluateCondition(condition, data, index) {
        const current = data[index];
        const prev = index > 0 ? data[index - 1] : null;
        
        let currentValue, prevValue;
        
        if (condition.indicator === 'price') {
          currentValue = current.close;
          prevValue = prev ? prev.close : null;
        } else if (condition.indicator === 'volume') {
          currentValue = current.volume;
          prevValue = prev ? prev.volume : null;
        } else {
          currentValue = current.indicators[condition.indicator];
          prevValue = prev ? prev.indicators[condition.indicator] : null;
        }
        
        if (currentValue === null || currentValue === undefined) return false;
        
        switch (condition.operator) {
          case '>':
            return currentValue > condition.value;
          case '<':
            return currentValue < condition.value;
          case '>=':
            return currentValue >= condition.value;
          case '<=':
            return currentValue <= condition.value;
          case '==':
            return Math.abs(currentValue - condition.value) < 0.01;
          case 'cross_above':
            return prevValue !== null && prevValue <= condition.value && currentValue > condition.value;
          case 'cross_below':
            return prevValue !== null && prevValue >= condition.value && currentValue < condition.value;
          default:
            return false;
        }
      }

      // 进化种群
      function evolvePopulation(population) {
        const sorted = population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
        const elite = sorted.slice(0, Math.floor(population.length * 0.2));
        const newPopulation = [...elite];
        
        while (newPopulation.length < population.length) {
          const parent1 = tournamentSelection(sorted);
          const parent2 = tournamentSelection(sorted);
          const child = crossover(parent1, parent2);
          mutate(child);
          newPopulation.push(child);
        }
        
        return newPopulation;
      }

      // 锦标赛选择
      function tournamentSelection(population) {
        const tournamentSize = 3;
        const tournament = [];
        
        for (let i = 0; i < tournamentSize; i++) {
          const randomIndex = Math.floor(Math.random() * population.length);
          tournament.push(population[randomIndex]);
        }
        
        return tournament.sort((a, b) => (b.fitness || 0) - (a.fitness || 0))[0];
      }

      // 交叉
      function crossover(parent1, parent2) {
        const child = {
          id: 'strategy_' + Date.now() + '_' + Math.random(),
          strategy: {
            ...parent1.strategy,
            id: 'strategy_' + Date.now() + '_' + Math.random(),
            name: 'Evolved Strategy',
            buyConditions: [...parent1.strategy.buyConditions],
            sellConditions: [...parent2.strategy.sellConditions],
            stopLoss: (parent1.strategy.stopLoss + parent2.strategy.stopLoss) / 2,
            takeProfit: (parent1.strategy.takeProfit + parent2.strategy.takeProfit) / 2
          },
          fitness: 0,
          generation: parent1.generation + 1
        };
        
        return child;
      }

      // 变异
      function mutate(individual) {
        const mutationRate = 0.1;
        
        if (Math.random() < mutationRate) {
          // 变异止损
          individual.strategy.stopLoss *= (0.8 + Math.random() * 0.4);
        }
        
        if (Math.random() < mutationRate) {
          // 变异止盈
          individual.strategy.takeProfit *= (0.8 + Math.random() * 0.4);
        }
        
        // 变异条件
        individual.strategy.buyConditions.forEach(condition => {
          if (Math.random() < mutationRate) {
            condition.value *= (0.9 + Math.random() * 0.2);
          }
        });
      }
    `;
  }

  private getBacktestWorkerCode(): string {
    return `
      // 回测Worker代码
      self.onmessage = function(event) {
        const { type, payload, id } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'BACKTEST':
              result = runBacktest(payload);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
          
          self.postMessage({
            type: type + '_RESULT',
            payload: result,
            id: id
          });
        } catch (error) {
          self.postMessage({
            type: type + '_ERROR',
            payload: null,
            id: id,
            error: error.message
          });
        }
      };

      // 运行回测
      function runBacktest(config) {
        const { strategy, data, initialCapital = 100000, commission = 0.001 } = config;
        
        let capital = initialCapital;
        let position = 0;
        let entryPrice = 0;
        let entryDate = '';
        const trades = [];
        const equityCurve = [];
        const drawdownCurve = [];
        let maxEquity = initialCapital;
        
        for (let i = 50; i < data.length; i++) {
          const current = data[i];
          const currentEquity = capital + (position * current.close);
          
          // 更新最大资产
          if (currentEquity > maxEquity) {
            maxEquity = currentEquity;
          }
          
          // 计算回撤
          const drawdown = (maxEquity - currentEquity) / maxEquity;
          
          equityCurve.push({
            date: current.date,
            equity: currentEquity
          });
          
          drawdownCurve.push({
            date: current.date,
            drawdown: drawdown
          });
          
          // 如果有持仓，检查卖出条件
          if (position > 0) {
            const holdDays = getDaysDifference(entryDate, current.date);
            const currentReturn = (current.close - entryPrice) / entryPrice;
            
            let shouldExit = false;
            let exitReason = 'SIGNAL';
            
            // 检查止损
            if (strategy.stopLoss && currentReturn <= -strategy.stopLoss) {
              shouldExit = true;
              exitReason = 'STOP_LOSS';
            }
            // 检查止盈
            else if (strategy.takeProfit && currentReturn >= strategy.takeProfit) {
              shouldExit = true;
              exitReason = 'TAKE_PROFIT';
            }
            // 检查最大持有天数
            else if (strategy.maxHoldDays && holdDays >= strategy.maxHoldDays) {
              shouldExit = true;
              exitReason = 'MAX_HOLD';
            }
            // 检查卖出信号
            else if (checkConditions(strategy.sellConditions, data, i)) {
              shouldExit = true;
              exitReason = 'SIGNAL';
            }
            
            if (shouldExit) {
              const exitPrice = current.close;
              const quantity = position;
              const grossPnl = (exitPrice - entryPrice) * quantity;
              const commissionCost = exitPrice * quantity * commission;
              const netPnl = grossPnl - commissionCost;
              
              capital += exitPrice * quantity - commissionCost;
              
              trades.push({
                entryDate: entryDate,
                exitDate: current.date,
                entryPrice: entryPrice,
                exitPrice: exitPrice,
                quantity: quantity,
                return: currentReturn,
                pnl: netPnl,
                holdDays: holdDays,
                type: 'LONG',
                exitReason: exitReason
              });
              
              position = 0;
              entryPrice = 0;
              entryDate = '';
            }
          }
          // 如果没有持仓，检查买入条件
          else if (checkConditions(strategy.buyConditions, data, i)) {
            const buyPrice = current.close;
            const commissionCost = capital * commission;
            const availableCapital = capital - commissionCost;
            const quantity = Math.floor(availableCapital / buyPrice);
            
            if (quantity > 0) {
              position = quantity;
              entryPrice = buyPrice;
              entryDate = current.date;
              capital -= quantity * buyPrice + commissionCost;
            }
          }
        }
        
        // 如果最后还有持仓，强制平仓
        if (position > 0) {
          const lastData = data[data.length - 1];
          const exitPrice = lastData.close;
          const quantity = position;
          const currentReturn = (exitPrice - entryPrice) / entryPrice;
          const grossPnl = (exitPrice - entryPrice) * quantity;
          const commissionCost = exitPrice * quantity * commission;
          const netPnl = grossPnl - commissionCost;
          
          capital += exitPrice * quantity - commissionCost;
          
          trades.push({
            entryDate: entryDate,
            exitDate: lastData.date,
            entryPrice: entryPrice,
            exitPrice: exitPrice,
            quantity: quantity,
            return: currentReturn,
            pnl: netPnl,
            holdDays: getDaysDifference(entryDate, lastData.date),
            type: 'LONG',
            exitReason: 'SIGNAL'
          });
        }
        
        // 计算统计指标
        const finalEquity = capital + (position * data[data.length - 1].close);
        const totalReturn = (finalEquity - initialCapital) / initialCapital;
        const tradingDays = data.length;
        const annualizedReturn = Math.pow(1 + totalReturn, 252 / tradingDays) - 1;
        
        const profitableTrades = trades.filter(t => t.pnl > 0).length;
        const winRate = trades.length > 0 ? profitableTrades / trades.length : 0;
        
        const returns = trades.map(t => t.return);
        const averageReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
        const volatility = calculateVolatility(returns);
        const sharpeRatio = volatility > 0 ? averageReturn / volatility : 0;
        
        const maxDrawdown = Math.max(...drawdownCurve.map(d => d.drawdown));
        
        return {
          strategyId: strategy.id,
          totalReturn: totalReturn,
          annualizedReturn: annualizedReturn,
          sharpeRatio: sharpeRatio,
          maxDrawdown: maxDrawdown,
          winRate: winRate,
          totalTrades: trades.length,
          profitableTrades: profitableTrades,
          averageReturn: averageReturn,
          volatility: volatility,
          trades: trades,
          equityCurve: equityCurve,
          drawdownCurve: drawdownCurve
        };
      }

      // 辅助函数
      function checkConditions(conditions, data, index) {
        if (conditions.length === 0) return false;
        
        let score = 0;
        let totalWeight = 0;
        
        for (const condition of conditions) {
          const weight = condition.weight || 1;
          totalWeight += weight;
          
          if (evaluateCondition(condition, data, index)) {
            score += weight;
          }
        }
        
        return score / totalWeight > 0.5;
      }

      function evaluateCondition(condition, data, index) {
        const current = data[index];
        const prev = index > 0 ? data[index - 1] : null;
        
        let currentValue, prevValue;
        
        if (condition.indicator === 'price') {
          currentValue = current.close;
          prevValue = prev ? prev.close : null;
        } else if (condition.indicator === 'volume') {
          currentValue = current.volume;
          prevValue = prev ? prev.volume : null;
        } else {
          currentValue = current.indicators[condition.indicator];
          prevValue = prev ? prev.indicators[condition.indicator] : null;
        }
        
        if (currentValue === null || currentValue === undefined) return false;
        
        switch (condition.operator) {
          case '>':
            return currentValue > condition.value;
          case '<':
            return currentValue < condition.value;
          case '>=':
            return currentValue >= condition.value;
          case '<=':
            return currentValue <= condition.value;
          case '==':
            return Math.abs(currentValue - condition.value) < 0.01;
          case 'cross_above':
            return prevValue !== null && prevValue <= condition.value && currentValue > condition.value;
          case 'cross_below':
            return prevValue !== null && prevValue >= condition.value && currentValue < condition.value;
          default:
            return false;
        }
      }

      function getDaysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      function calculateVolatility(returns) {
        if (returns.length < 2) return 0;
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / (returns.length - 1);
        return Math.sqrt(variance);
      }
    `;
  }

  private getPatternsWorkerCode(): string {
    return `
      // 形态匹配Worker
      self.onmessage = function(event) {
        const { type, payload, id } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'PATTERN_MATCH':
              result = findPatternMatches(payload);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
          
          self.postMessage({
            type: type + '_RESULT',
            payload: result,
            id: id
          });
        } catch (error) {
          self.postMessage({
            type: type + '_ERROR',
            payload: null,
            id: id,
            error: error.message
          });
        }
      };

      // 查找形态匹配
      function findPatternMatches(config) {
        const { targetPattern, fullData, maxMatches = 10, minSimilarity = 0.6 } = config;
        
        const matches = [];
        const targetLength = targetPattern.length;
        
        // 提取目标形态特征
        const targetFeatures = extractPatternFeatures(targetPattern);
        
        // 滑动窗口搜索
        for (let i = 0; i <= fullData.length - targetLength; i++) {
          const candidate = fullData.slice(i, i + targetLength);
          
          // 跳过与目标形态重叠的区间
          if (isOverlapping(targetPattern, candidate)) continue;
          
          // 计算相似度
          const similarity = calculatePatternSimilarity(targetPattern, candidate);
          
          if (similarity >= minSimilarity) {
            const candidateFeatures = extractPatternFeatures(candidate);
            const correlation = calculateCorrelation(
              targetPattern.map(d => d.close),
              candidate.map(d => d.close)
            );
            const dtwDistance = calculateDTW(
              targetPattern.map(d => d.close),
              candidate.map(d => d.close)
            );
            
            matches.push({
              startDate: candidate[0].date,
              endDate: candidate[candidate.length - 1].date,
              similarity: similarity,
              data: candidate,
              correlation: correlation,
              dtw_distance: dtwDistance,
              features: candidateFeatures
            });
          }
        }
        
        // 按相似度排序并返回前N个
        return matches
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, maxMatches);
      }

      // 提取形态特征
      function extractPatternFeatures(pattern) {
        const prices = pattern.map(d => d.close);
        const volumes = pattern.map(d => d.volume);
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        
        // 计算趋势斜率
        const trend = (endPrice - startPrice) / startPrice;
        
        // 计算波动率
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }
        const volatility = calculateStandardDeviation(returns);
        
        // 计算成交量趋势
        const volumeTrend = (volumes[volumes.length - 1] - volumes[0]) / volumes[0];
        
        return {
          volatility: volatility,
          trend: trend,
          volume_trend: volumeTrend,
          price_range: (maxPrice - minPrice) / startPrice,
          duration: pattern.length,
          max_gain: (maxPrice - startPrice) / startPrice,
          max_loss: (minPrice - startPrice) / startPrice
        };
      }

      // 计算形态相似度
      function calculatePatternSimilarity(pattern1, pattern2) {
        if (pattern1.length !== pattern2.length) return 0;
        
        const prices1 = normalizeArray(pattern1.map(d => d.close));
        const prices2 = normalizeArray(pattern2.map(d => d.close));
        const volumes1 = normalizeArray(pattern1.map(d => d.volume));
        const volumes2 = normalizeArray(pattern2.map(d => d.volume));
        
        // 价格相似度 (70%权重)
        const priceCorr = calculateCorrelation(prices1, prices2);
        const priceSimilarity = Math.max(0, priceCorr);
        
        // 成交量相似度 (30%权重)
        const volumeCorr = calculateCorrelation(volumes1, volumes2);
        const volumeSimilarity = Math.max(0, volumeCorr);
        
        return priceSimilarity * 0.7 + volumeSimilarity * 0.3;
      }

      // DTW算法
      function calculateDTW(series1, series2) {
        const n = series1.length;
        const m = series2.length;
        const dtw = Array(n + 1).fill().map(() => Array(m + 1).fill(Infinity));
        
        dtw[0][0] = 0;
        
        for (let i = 1; i <= n; i++) {
          for (let j = 1; j <= m; j++) {
            const cost = Math.abs(series1[i - 1] - series2[j - 1]);
            dtw[i][j] = cost + Math.min(
              dtw[i - 1][j],     // insertion
              dtw[i][j - 1],     // deletion
              dtw[i - 1][j - 1]  // match
            );
          }
        }
        
        return dtw[n][m];
      }

      // 计算相关系数
      function calculateCorrelation(x, y) {
        if (x.length !== y.length) return 0;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
        const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
      }

      // 标准化数组
      function normalizeArray(arr) {
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        const range = max - min;
        
        if (range === 0) return arr.map(() => 0);
        
        return arr.map(val => (val - min) / range);
      }

      // 计算标准差
      function calculateStandardDeviation(arr) {
        if (arr.length === 0) return 0;
        
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
      }

      // 检查是否重叠
      function isOverlapping(pattern1, pattern2) {
        const start1 = new Date(pattern1[0].date);
        const end1 = new Date(pattern1[pattern1.length - 1].date);
        const start2 = new Date(pattern2[0].date);
        const end2 = new Date(pattern2[pattern2.length - 1].date);
        
        return !(end1 < start2 || end2 < start1);
      }
    `;
  }

  private getOptimizationWorkerCode(): string {
    return `
      // 参数优化Worker
      self.onmessage = function(event) {
        const { type, payload, id } = event.data;
        
        try {
          let result;
          switch (type) {
            case 'OPTIMIZE':
              result = optimizeParameters(payload);
              break;
            default:
              throw new Error('Unknown message type: ' + type);
          }
          
          self.postMessage({
            type: type + '_RESULT',
            payload: result,
            id: id
          });
        } catch (error) {
          self.postMessage({
            type: type + '_ERROR',
            payload: null,
            id: id,
            error: error.message
          });
        }
      };

      // 参数优化
      function optimizeParameters(config) {
        const { strategy, data, parameters, method = 'grid' } = config;
        
        if (method === 'grid') {
          return gridSearchOptimization(strategy, data, parameters);
        } else {
          return bayesianOptimization(strategy, data, parameters);
        }
      }

      // 网格搜索优化
      function gridSearchOptimization(strategy, data, parameters) {
        const results = [];
        const parameterCombinations = generateParameterCombinations(parameters);
        
        for (let i = 0; i < parameterCombinations.length; i++) {
          const params = parameterCombinations[i];
          const modifiedStrategy = applyParameters(strategy, params);
          const backtest = runSimpleBacktest(modifiedStrategy, data);
          
          results.push({
            parameters: params,
            fitness: calculateFitness(backtest),
            backtest: backtest
          });
          
          // 发送进度更新
          if (i % 10 === 0) {
            self.postMessage({
              type: 'OPTIMIZATION_PROGRESS',
              payload: {
                completed: i + 1,
                total: parameterCombinations.length,
                bestFitness: Math.max(...results.map(r => r.fitness))
              },
              id: 'progress'
            });
          }
        }
        
        return results.sort((a, b) => b.fitness - a.fitness);
      }

      // 生成参数组合
      function generateParameterCombinations(parameters) {
        const combinations = [];
        const paramNames = Object.keys(parameters);
        
        function generateCombination(index, current) {
          if (index === paramNames.length) {
            combinations.push({ ...current });
            return;
          }
          
          const param = parameters[paramNames[index]];
          const values = generateParameterValues(param);
          
          for (const value of values) {
            current[paramNames[index]] = value;
            generateCombination(index + 1, current);
          }
        }
        
        generateCombination(0, {});
        return combinations;
      }

      // 生成参数值
      function generateParameterValues(param) {
        const values = [];
        
        if (param.type === 'number') {
          const step = param.step || (param.max - param.min) / 10;
          for (let val = param.min; val <= param.max; val += step) {
            values.push(val);
          }
        } else if (param.type === 'boolean') {
          values.push(true, false);
        } else if (param.type === 'select') {
          values.push(...param.options);
        }
        
        return values;
      }

      // 应用参数到策略
      function applyParameters(strategy, parameters) {
        const modified = JSON.parse(JSON.stringify(strategy));
        
        Object.keys(parameters).forEach(key => {
          if (key === 'stopLoss') {
            modified.stopLoss = parameters[key];
          } else if (key === 'takeProfit') {
            modified.takeProfit = parameters[key];
          } else if (key === 'maxHoldDays') {
            modified.maxHoldDays = parameters[key];
          }
          // 可以添加更多参数映射
        });
        
        return modified;
      }

      // 简化的回测
      function runSimpleBacktest(strategy, data) {
        let capital = 100000;
        let position = 0;
        let entryPrice = 0;
        const trades = [];
        
        for (let i = 50; i < data.length; i++) {
          const current = data[i];
          
          if (position > 0) {
            const currentReturn = (current.close - entryPrice) / entryPrice;
            let shouldExit = false;
            
            if (strategy.stopLoss && currentReturn <= -strategy.stopLoss) {
              shouldExit = true;
            } else if (strategy.takeProfit && currentReturn >= strategy.takeProfit) {
              shouldExit = true;
            }
            
            if (shouldExit) {
              const pnl = (current.close - entryPrice) * position;
              trades.push({
                return: currentReturn,
                pnl: pnl
              });
              
              capital += current.close * position;
              position = 0;
              entryPrice = 0;
            }
          } else {
            // 简化的买入信号
            if (Math.random() < 0.05) { // 5%概率买入
              const quantity = Math.floor(capital * 0.1 / current.close);
              if (quantity > 0) {
                position = quantity;
                entryPrice = current.close;
                capital -= quantity * current.close;
              }
            }
          }
        }
        
        const totalReturn = trades.reduce((acc, trade) => acc + trade.return, 0);
        const winRate = trades.filter(t => t.return > 0).length / Math.max(trades.length, 1);
        
        return {
          totalReturn: totalReturn,
          winRate: winRate,
          totalTrades: trades.length,
          trades: trades
        };
      }

      // 计算适应度
      function calculateFitness(backtest) {
        const returnScore = backtest.totalReturn * 100;
        const winRateScore = backtest.winRate * 50;
        const tradeCountScore = Math.min(backtest.totalTrades, 50);
        
        return returnScore + winRateScore + tradeCountScore;
      }
    `;
  }

  // 发送消息到Worker
  sendMessage(workerType: string, message: WorkerMessage): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const worker = this.workers[workerType];
      if (!worker) {
        reject(new Error(`Worker ${workerType} not found`));
        return;
      }

      const messageId = `msg_${++this.messageId}_${Date.now()}`;
      const messageWithId = { ...message, id: messageId };

      this.messageHandlers[messageId] = (response: WorkerResponse) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      };

      worker.postMessage(messageWithId);

      // 设置超时
      setTimeout(() => {
        if (this.messageHandlers[messageId]) {
          delete this.messageHandlers[messageId];
          reject(new Error('Worker timeout'));
        }
      }, 30000); // 30秒超时
    });
  }

  // 终止所有Worker
  terminate() {
    Object.values(this.workers).forEach(worker => {
      worker.terminate();
    });
    this.workers = {};
    this.messageHandlers = {};
  }
}
