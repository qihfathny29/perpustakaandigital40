# 🧪 Testing Overdue Feature Guide

## Method 1: Quick Test (Recommended)
1. Login as student
2. Go to Student Dashboard 
3. Click **"🧪 Test Fake Overdue"** button in sidebar
4. ✅ Modal should appear with test overdue book

## Method 2: Real Data Test
1. Login as student  
2. Borrow some books (go to Book Catalog)
3. Wait for petugas to approve
4. Go to Student Dashboard
5. Click **"⏰ Make Real Books Overdue"** button
6. ✅ Modal should appear with your actual books marked as overdue

## Method 3: Database Test (Most Realistic)
1. Login as student and borrow books
2. Wait for petugas approval 
3. Connect to SQL Server database
4. Run this query to make books overdue:
```sql
UPDATE borrowed_books 
SET due_date = DATEADD(day, -2, GETDATE()) 
WHERE user_id = [your_user_id] AND status = 'borrowed';
```
5. Refresh student dashboard
6. ✅ Overdue modal should appear automatically

## Method 4: Time Travel Test
1. Change your computer system date to future (e.g., +1 week)
2. Login as student with existing borrowed books
3. ✅ Books should automatically be overdue

## Expected Behavior:
- ⚠️ Red modal with warning icon
- 📋 Table showing overdue book details  
- 🔴 "Terlambat" status badge
- 📅 Due date vs current date comparison
- ✅ "Ok, saya kembalikan" button
- 🔄 Redirects to return tab when clicked

## Remove Test Buttons:
When done testing, remove the debug buttons from StudentDashboard.jsx (lines with 🧪 and ⏰)

## Console Logs to Check:
- Look for overdue detection logs
- Check borrowed books filtering
- Monitor modal state changes