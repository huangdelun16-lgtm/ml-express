package com.mlexpress.courier.data.local.dao

import androidx.room.*
import com.mlexpress.courier.data.model.Courier
import com.mlexpress.courier.data.model.CourierStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface CourierDao {
    
    @Query("SELECT * FROM couriers WHERE id = :courierId")
    suspend fun getCourierById(courierId: String): Courier?
    
    @Query("SELECT * FROM couriers WHERE phoneNumber = :phoneNumber")
    suspend fun getCourierByPhone(phoneNumber: String): Courier?
    
    @Query("SELECT * FROM couriers WHERE id = :courierId")
    fun getCourierByIdFlow(courierId: String): Flow<Courier?>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCourier(courier: Courier)
    
    @Update
    suspend fun updateCourier(courier: Courier)
    
    @Delete
    suspend fun deleteCourier(courier: Courier)
    
    @Query("UPDATE couriers SET status = :status, isOnline = :isOnline WHERE id = :courierId")
    suspend fun updateCourierStatus(courierId: String, status: CourierStatus, isOnline: Boolean)
    
    @Query("UPDATE couriers SET currentLatitude = :latitude, currentLongitude = :longitude, lastLocationUpdate = :timestamp WHERE id = :courierId")
    suspend fun updateCourierLocation(courierId: String, latitude: Double, longitude: Double, timestamp: Long)
    
    @Query("UPDATE couriers SET fcmToken = :token WHERE id = :courierId")
    suspend fun updateFcmToken(courierId: String, token: String)
    
    @Query("UPDATE couriers SET language = :language WHERE id = :courierId")
    suspend fun updateLanguage(courierId: String, language: String)
    
    @Query("UPDATE couriers SET totalOrders = :totalOrders, completedOrders = :completedOrders, totalEarnings = :totalEarnings WHERE id = :courierId")
    suspend fun updateCourierStats(courierId: String, totalOrders: Int, completedOrders: Int, totalEarnings: Double)
    
    @Query("DELETE FROM couriers")
    suspend fun clearAllCouriers()
}
