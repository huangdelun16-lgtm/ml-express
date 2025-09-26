package com.mlexpress.customer.data.local.database

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.dao.UserDao
import com.mlexpress.customer.data.model.Order
import com.mlexpress.customer.data.model.User

@Database(
    entities = [User::class, Order::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(DatabaseConverters::class)
abstract class MLExpressDatabase : RoomDatabase() {
    
    abstract fun userDao(): UserDao
    abstract fun orderDao(): OrderDao
    
    companion object {
        @Volatile
        private var INSTANCE: MLExpressDatabase? = null
        
        fun getDatabase(context: Context): MLExpressDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MLExpressDatabase::class.java,
                    "ml_express_database"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
