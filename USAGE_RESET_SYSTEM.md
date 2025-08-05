# Usage Reset System Analysis

## Current Implementation Overview

The system has **two different tracking mechanisms** but only uses one for actual usage checking:

### 1. Primary System (Currently Used)
- **Table**: `question_generations`
- **Method**: Calendar month counting
- **Logic**: Count rows where `generated_at >= first_day_of_current_month`
- **Reset**: Automatic (no database changes needed)
- **Implementation**: `/src/app/api/usage/route.ts` lines 44-53

```typescript
// Get current month start for usage tracking
const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

// Check user's current usage this month
const { data: usageData } = await supabaseAdmin
  .from('question_generations')
  .select('id, generated_at')
  .eq('user_id', user.id)
  .gte('generated_at', monthStart.toISOString());

const currentUsage = usageData?.length || 0;
```

### 2. Secondary System (Maintained but Not Used for Limits)
- **Table**: `usage_tracking`
- **Fields**: `questions_generated`, `last_reset_date`
- **Method**: Manual counter with reset tracking
- **Updated**: When questions are generated (incremented)
- **Reset**: Via `reset_monthly_usage()` database function (not currently called)

## How Reset Currently Works

### ✅ **Automatic Reset (Primary System)**
- **When**: Every 1st of the month at 00:00 UTC
- **How**: Query automatically excludes previous month's data
- **Trigger**: No database trigger needed - it's query-based
- **Reliability**: 100% automatic, no maintenance required

**Example Timeline:**
- August 31, 23:59 UTC → Usage: 3/3 (blocked)
- September 1, 00:00 UTC → Usage: 0/3 (reset automatically)

### ⚠️ **Manual Reset (Secondary System)**
- **Table**: `usage_tracking` table
- **Function**: `reset_monthly_usage()` database function
- **Status**: **NOT CURRENTLY USED** for usage limits
- **Purpose**: Appears to be legacy or backup system

## Database Fields Involved

### Primary System Fields:
```sql
question_generations:
- id (primary key)
- user_id (foreign key to users)
- generated_at (timestamp - THIS IS THE RESET TRIGGER)
- job_title, company_name, hiring_stage, questions_count
```

### Secondary System Fields:
```sql
usage_tracking:
- id (primary key)  
- user_id (foreign key to users)
- questions_generated (counter - incremented on use)
- last_reset_date (timestamp - reset tracking)
- created_at, updated_at
```

### Database Functions:
```sql
reset_monthly_usage() - Resets usage_tracking table counters
can_generate_questions(user_uuid) - Returns boolean (usage check)
```

## Reset Date Calculation

### Current Logic:
```typescript
// Calculate next reset date (1st of next month)
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
const resetDate = nextMonth.toISOString();
```

### Display Logic:
```typescript
// Frontend formatting with UTC timezone
new Date(resetDate).toLocaleDateString('en-US', { 
  month: 'numeric', 
  day: 'numeric', 
  year: 'numeric',
  timeZone: 'UTC'
})
```

## System Strengths

1. **Reliable**: Calendar month system is automatic and foolproof
2. **Accurate**: Uses actual generation timestamps, no counter drift
3. **Simple**: No complex reset jobs or database triggers needed
4. **Transparent**: Easy to audit and debug usage patterns
5. **Scalable**: Query performance is good with proper indexing

## Potential Issues

1. **Timezone**: Server processes dates in UTC, but users see local time
2. **Dual Systems**: `usage_tracking` table is maintained but not used for limits
3. **No Manual Reset**: If needed, there's no easy way to reset individual users
4. **Month Boundary**: Edge cases around month transitions

## Recommendations

### ✅ **Keep Current System** - It works well
### 🔧 **Improvements**:
1. **Fix timezone display** (already implemented in this commit)
2. **Consider removing** `usage_tracking` updates if not needed
3. **Add monitoring** for month transition edge cases
4. **Document the dual system** for future developers

## Technical Implementation Details

### Usage Check Flow:
1. User requests usage info → `/api/usage`
2. Server calculates `monthStart = first day of current month`
3. Query `question_generations` table for current month records
4. Count rows = current usage
5. Compare against limit (3 for free users)
6. Calculate next reset date (1st of next month)
7. Return usage info to frontend

### Reset Mechanism:
- **No active reset process**
- **Automatic**: New month = new query scope = automatic reset
- **Reliable**: Based on timestamp comparison, not counters

## Summary

The current system is **well-designed and robust**. The primary issue was the frontend timezone display, which has been fixed. The "reset" happens automatically through query date filtering rather than database updates, making it extremely reliable and maintenance-free.