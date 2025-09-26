package com.mlexpress.customer.di

import android.content.Context
import androidx.room.Room
import com.mlexpress.customer.data.local.dao.OrderDao
import com.mlexpress.customer.data.local.dao.UserDao
import com.mlexpress.customer.data.local.database.MLExpressDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideMLExpressDatabase(
        @ApplicationContext context: Context
    ): MLExpressDatabase {
        return Room.databaseBuilder(
            context.applicationContext,
            MLExpressDatabase::class.java,
            "ml_express_database"
        )
            .fallbackToDestructiveMigration()
            .build()
    }
    
    @Provides
    fun provideUserDao(database: MLExpressDatabase): UserDao {
        return database.userDao()
    }
    
    @Provides
    fun provideOrderDao(database: MLExpressDatabase): OrderDao {
        return database.orderDao()
    }
}
