package com.mlexpress.customer.data.local.dao

import androidx.room.*
import com.mlexpress.customer.data.model.User
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    
    @Query("SELECT * FROM users WHERE id = :userId")
    suspend fun getUserById(userId: String): User?
    
    @Query("SELECT * FROM users WHERE phoneNumber = :phoneNumber")
    suspend fun getUserByPhone(phoneNumber: String): User?
    
    @Query("SELECT * FROM users WHERE id = :userId")
    fun getUserByIdFlow(userId: String): Flow<User?>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)
    
    @Update
    suspend fun updateUser(user: User)
    
    @Delete
    suspend fun deleteUser(user: User)
    
    @Query("UPDATE users SET fcmToken = :token WHERE id = :userId")
    suspend fun updateFcmToken(userId: String, token: String)
    
    @Query("UPDATE users SET language = :language WHERE id = :userId")
    suspend fun updateLanguage(userId: String, language: String)
    
    @Query("UPDATE users SET isActive = :isActive WHERE id = :userId")
    suspend fun updateUserStatus(userId: String, isActive: Boolean)
    
    @Query("DELETE FROM users")
    suspend fun clearAllUsers()
}
