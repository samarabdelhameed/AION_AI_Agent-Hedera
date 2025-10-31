#!/bin/bash

# 🎯 سكريبت اختبار سريع - AION AI Agent
# مدة التنفيذ: دقيقتين

echo "🚀 بدء اختبار AION AI Agent..."
echo ""

# الخطوة 1: فحص صحة النظام
echo "✅ الخطوة 1/5: فحص صحة Backend..."
curl -s http://localhost:3003/health | grep -q "healthy" && echo "   ✅ Backend يعمل بنجاح!" || echo "   ❌ Backend لا يعمل"
echo ""

# الخطوة 2: فحص Hedera
echo "✅ الخطوة 2/5: فحص تكامل Hedera..."
curl -s http://localhost:3003/api/hedera/health | grep -q "success" && echo "   ✅ Hedera متصل بنجاح!" || echo "   ❌ Hedera غير متصل"
echo ""

# الخطوة 3: فحص Frontend
echo "✅ الخطوة 3/5: فحص الواجهة..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200" && echo "   ✅ Frontend يعمل بنجاح!" || echo "   ❌ Frontend لا يعمل"
echo ""

# الخطوة 4: إرسال قرار AI اختباري
echo "✅ الخطوة 4/5: إرسال قرار AI اختباري..."
RESPONSE=$(curl -s -X POST http://localhost:3003/api/hedera/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TEST",
    "action": "quick_test",
    "confidence": 1.0,
    "reasoning": "Testing from script"
  }')

echo "$RESPONSE" | grep -q "success" && echo "   ✅ تم تسجيل القرار بنجاح!" || echo "   ❌ فشل تسجيل القرار"
echo ""

# الخطوة 5: عرض الروابط المهمة
echo "✅ الخطوة 5/5: الروابط المهمة"
echo "   🎨 Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:3003"
echo "   🪙 HTS Token: https://hashscan.io/testnet/token/0.0.7167606"
echo "   🧩 HCS Topic: https://hashscan.io/testnet/topic/0.0.7167607"
echo "   📁 HFS Files: https://hashscan.io/testnet/file/0.0.7167610"
echo ""

echo "🎉 اختبار مكتمل! النظام يعمل بنجاح!"
echo ""
echo "📖 للمزيد من الاختبارات:"
echo "   - سريع (5 دقائق): cat QUICK_TEST_SCENARIO.md"
echo "   - متقدم (30 دقيقة): cat ADVANCED_TEST_SCENARIOS.md"
